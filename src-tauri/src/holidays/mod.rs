use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Duration;

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const CACHE_FILE: &str = "holidays-cache.json";
pub const PRIMARY_URL_TEMPLATE: &str =
    "https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json";
pub const FALLBACK_URL_TEMPLATE: &str =
    "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json";
const BUNDLED_HOLIDAYS: &str = include_str!("../../../data/cn-holidays.json");
const FETCH_TIMEOUT_SECS: u64 = 8;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayDay {
    pub kind: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidaysCache {
    pub source_url: String,
    pub fetched_at: String,
    pub days: HashMap<String, HolidayDay>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct BundledHolidays {
    days: HashMap<String, HolidayDay>,
}

#[derive(Debug, Deserialize)]
struct SourceYear {
    days: Vec<SourceDay>,
}

#[derive(Debug, Deserialize)]
struct SourceDay {
    name: String,
    date: String,
    #[serde(rename = "isOffDay")]
    is_off_day: bool,
}

#[derive(Debug, Error)]
pub enum HolidaysError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("network: {0}")]
    Network(String),
}

pub fn cache_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(CACHE_FILE)
}

pub fn read_cache(path: &Path) -> Result<Option<HolidaysCache>, HolidaysError> {
    match std::fs::read_to_string(path) {
        Ok(raw) => Ok(Some(serde_json::from_str(&raw)?)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(HolidaysError::Io(err)),
    }
}

pub fn write_cache(path: &Path, cache: &HolidaysCache) -> Result<(), HolidaysError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(cache)?;
    std::fs::write(path, raw)?;
    Ok(())
}

pub fn parse_bundled() -> Result<HashMap<String, HolidayDay>, HolidaysError> {
    let bundled: BundledHolidays = serde_json::from_str(BUNDLED_HOLIDAYS)?;
    Ok(bundled.days)
}

fn map_source_day(day: &SourceDay) -> (String, HolidayDay) {
    if day.is_off_day {
        (
            day.date.clone(),
            HolidayDay {
                kind: "rest".to_string(),
                name: day.name.clone(),
            },
        )
    } else {
        let name = if day.name.contains('调') {
            day.name.clone()
        } else {
            format!("{}调班", day.name)
        };
        (
            day.date.clone(),
            HolidayDay {
                kind: "work".to_string(),
                name,
            },
        )
    }
}

pub fn parse_source_year(raw: &str) -> Result<HashMap<String, HolidayDay>, HolidaysError> {
    let year: SourceYear = serde_json::from_str(raw)?;
    Ok(year.days.iter().map(map_source_day).collect())
}

fn fetch_year(
    client: &Client,
    year: i32,
    custom_url_template: Option<&str>,
) -> Result<(String, HashMap<String, HolidayDay>), HolidaysError> {
    let primary = match custom_url_template.filter(|s| !s.is_empty()) {
        Some(template) => template.replace("{year}", &year.to_string()),
        None => PRIMARY_URL_TEMPLATE.replace("{year}", &year.to_string()),
    };
    let fallback = FALLBACK_URL_TEMPLATE.replace("{year}", &year.to_string());

    match client.get(&primary).send() {
        Ok(response) if response.status().is_success() => {
            let body = response
                .text()
                .map_err(|e| HolidaysError::Network(e.to_string()))?;
            let days = parse_source_year(&body)?;
            return Ok((primary, days));
        }
        Ok(response) => {
            eprintln!("holiday primary fetch {year} status {}", response.status());
        }
        Err(err) => {
            eprintln!("holiday primary fetch {year} failed: {err}");
        }
    }

    let response = client
        .get(&fallback)
        .send()
        .map_err(|e| HolidaysError::Network(e.to_string()))?;
    if !response.status().is_success() {
        return Err(HolidaysError::Network(format!(
            "fetch failed for {year} (status {})",
            response.status()
        )));
    }
    let body = response
        .text()
        .map_err(|e| HolidaysError::Network(e.to_string()))?;
    let days = parse_source_year(&body)?;
    Ok((fallback, days))
}

fn utc_today() -> (i32, String) {
    let days = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock")
        .as_secs() as i64
        / 86_400;
    let (y, m, d) = civil_from_days(days);
    (y, format!("{y:04}-{m:02}-{d:02}"))
}

/// Days since 1970-01-01 UTC → (year, month, day).
fn civil_from_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524) / 365;
    let y = (yoe as i32) + (era as i32) * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (mp + if mp < 10 { 3 } else { -9 }) as u32;
    let year = y + if m <= 2 { 1 } else { 0 };
    let month = if m <= 2 { m + 9 } else { m - 3 };
    (year, month, d)
}

pub fn fetch_current_and_next_year(
    custom_url_template: Option<&str>,
) -> Result<HolidaysCache, HolidaysError> {
    let client = Client::builder()
        .timeout(Duration::from_secs(FETCH_TIMEOUT_SECS))
        .build()
        .map_err(|e| HolidaysError::Network(e.to_string()))?;

    let (current_year, fetched_at) = utc_today();
    let mut merged = HashMap::new();
    let custom = custom_url_template.filter(|s| !s.is_empty());
    let mut source_url = match custom {
        Some(template) => template.replace("{year}", &current_year.to_string()),
        None => PRIMARY_URL_TEMPLATE.replace("{year}", &current_year.to_string()),
    };

    for year in [current_year, current_year + 1] {
        let (url, days) = fetch_year(&client, year, custom)?;
        if year == current_year {
            source_url = url;
        }
        merged.extend(days);
    }

    Ok(HolidaysCache {
        source_url,
        fetched_at,
        days: merged,
    })
}

pub fn load_days(app_data_dir: &Path) -> Result<(HashMap<String, HolidayDay>, bool, bool), HolidaysError> {
    let cache_file = cache_path(app_data_dir);
    if let Some(cache) = read_cache(&cache_file)? {
        if !cache.days.is_empty() {
            return Ok((cache.days, true, false));
        }
    }
    let days = parse_bundled()?;
    Ok((days, false, true))
}

pub fn holidays_status(app_data_dir: &Path) -> Result<HolidaysStatus, HolidaysError> {
    let cache_file = cache_path(app_data_dir);
    if let Some(cache) = read_cache(&cache_file)? {
        if !cache.days.is_empty() {
            return Ok(HolidaysStatus {
                source_url: cache.source_url,
                fetched_at: Some(cache.fetched_at),
                using_cache: true,
                using_bundle: false,
            });
        }
    }
    Ok(HolidaysStatus {
        source_url: PRIMARY_URL_TEMPLATE.replace("{year}", "YYYY"),
        fetched_at: None,
        using_cache: false,
        using_bundle: true,
    })
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidaysStatus {
    pub source_url: String,
    pub fetched_at: Option<String>,
    pub using_cache: bool,
    pub using_bundle: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidaysPayload {
    pub days: HashMap<String, HolidayDay>,
}

pub fn holidays_get(app_data_dir: &Path) -> Result<HolidaysPayload, HolidaysError> {
    let (days, _, _) = load_days(app_data_dir)?;
    Ok(HolidaysPayload { days })
}

pub fn holidays_refresh(
    app_data_dir: &Path,
    holiday_source_url: &str,
) -> Result<HolidaysCache, HolidaysError> {
    let custom = if holiday_source_url.is_empty() {
        None
    } else {
        Some(holiday_source_url)
    };
    let cache = fetch_current_and_next_year(custom)?;
    write_cache(&cache_path(app_data_dir), &cache)?;
    Ok(cache)
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE_2026: &str = r#"{
      "year": 2026,
      "days": [
        { "name": "元旦", "date": "2026-01-01", "isOffDay": true },
        { "name": "元旦", "date": "2026-01-04", "isOffDay": false },
        { "name": "春节调班", "date": "2026-02-14", "isOffDay": false }
      ]
    }"#;

    #[test]
    fn parse_rest_day() {
        let days = parse_source_year(FIXTURE_2026).expect("parse");
        assert_eq!(
            days.get("2026-01-01"),
            Some(&HolidayDay {
                kind: "rest".to_string(),
                name: "元旦".to_string(),
            })
        );
    }

    #[test]
    fn parse_work_day_appends_tiaoban() {
        let days = parse_source_year(FIXTURE_2026).expect("parse");
        assert_eq!(
            days.get("2026-01-04"),
            Some(&HolidayDay {
                kind: "work".to_string(),
                name: "元旦调班".to_string(),
            })
        );
    }

    #[test]
    fn parse_work_day_keeps_existing_tiaoban_suffix() {
        let days = parse_source_year(FIXTURE_2026).expect("parse");
        assert_eq!(
            days.get("2026-02-14"),
            Some(&HolidayDay {
                kind: "work".to_string(),
                name: "春节调班".to_string(),
            })
        );
    }

    #[test]
    fn bundled_json_parses() {
        let days = parse_bundled().expect("bundled");
        assert!(days.contains_key("2026-01-01"));
    }

    #[test]
    fn load_days_uses_bundle_when_no_cache() {
        let dir = tempfile::tempdir().expect("tempdir");
        let (days, using_cache, using_bundle) = load_days(dir.path()).expect("load");
        assert!(!using_cache);
        assert!(using_bundle);
        assert!(days.contains_key("2026-01-01"));
    }

    #[test]
    fn load_days_prefers_cache_with_days() {
        let dir = tempfile::tempdir().expect("tempdir");
        let cache = HolidaysCache {
            source_url: "test".to_string(),
            fetched_at: "2026-08-30".to_string(),
            days: HashMap::from([(
                "2099-01-01".to_string(),
                HolidayDay {
                    kind: "rest".to_string(),
                    name: "测试".to_string(),
                },
            )]),
        };
        write_cache(&cache_path(dir.path()), &cache).expect("write cache");
        let (days, using_cache, using_bundle) = load_days(dir.path()).expect("load");
        assert!(using_cache);
        assert!(!using_bundle);
        assert_eq!(days.get("2099-01-01").map(|d| d.name.as_str()), Some("测试"));
    }
}
