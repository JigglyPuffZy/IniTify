"""
Generate expert-labeled HeatHits / IniTify training dataset.

Labels follow the provisional PAGASA-band + risk-factor rules documented in
ml/data/LABELING_GUIDE.md (same logic as src/config/decision-tree.rules.ts).

This is EXPERT-LABELED SYNTHETIC data for model development — not real survey data.
"""

from __future__ import annotations

import csv
import itertools
import random
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
CSV_PATH = DATA_DIR / "heat_risk_dataset.csv"
XLSX_PATH = DATA_DIR / "heat_risk_dataset.xlsx"

HEADERS = [
    "record_id",
    "heat_index",
    "age",
    "health_condition",
    "activity_level",
    "hydration_status",
    "risk_level",
    "pagasa_band",
    "notes",
]

HEALTH_NONE = {"None", "Healthy", "N/A"}
ACTIVITY_LEVELS = ["Low", "Moderate", "High"]
HYDRATION_STATUSES = ["Well hydrated", "Moderately hydrated", "Dehydrated"]
HEALTH_CONDITIONS = [
    "None",
    "Healthy",
    "Hypertension",
    "Diabetes",
    "Asthma",
    "Heart disease",
]
RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "EXTREME"]

PAGASA_BANDS = [
    (22, "Below caution (<27)"),
    (29, "Caution (27–32)"),
    (37, "Extreme caution (33–41)"),
    (46, "Danger (42–51)"),
    (54, "Extreme danger (≥52)"),
]


def pagasa_band(heat_index: float) -> str:
    if heat_index >= 52:
        return "Extreme danger (≥52)"
    if heat_index >= 42:
        return "Danger (42–51)"
    if heat_index >= 33:
        return "Extreme caution (33–41)"
    if heat_index >= 27:
        return "Caution (27–32)"
    return "Below caution (<27)"


def has_health_risk(health: str) -> bool:
    return health.strip().lower() not in {
        "none",
        "n/a",
        "no condition",
        "healthy",
        "",
    }


def count_risk_factors(age: int, health: str, activity: str, hydration: str) -> int:
    count = 0
    if age >= 60:
        count += 1
    if has_health_risk(health):
        count += 1
    if activity == "High":
        count += 1
    if hydration == "Dehydrated":
        count += 1
    return count


def label_risk(
    heat_index: float, age: int, health: str, activity: str, hydration: str
) -> str:
    """Expert labeling aligned with provisional IniTify decision tree."""
    if heat_index >= 42:
        return "EXTREME"

    factors = count_risk_factors(age, health, activity, hydration)

    if heat_index >= 33:
        if factors >= 1:
            return "EXTREME"
        return "HIGH"

    if heat_index >= 27:
        if factors >= 2:
            return "HIGH"
        if factors == 1:
            return "HIGH"
        return "MODERATE"

    # Below 27 °C
    if factors >= 1:
        return "MODERATE"
    return "LOW"


def build_rows() -> list[dict[str, str | int | float]]:
    rows: list[dict[str, str | int | float]] = []
    record_id = 1

    # Structured grid: heat bands × ages × representative profiles
    age_samples = [8, 16, 25, 35, 48, 55, 62, 71, 78]
    heat_samples = [22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 41, 43, 45, 48, 52, 55]

    profiles = [
        ("None", "Low", "Well hydrated", "Typical low-exposure profile"),
        ("None", "Moderate", "Moderately hydrated", "Average daily activity"),
        ("None", "High", "Moderately hydrated", "Outdoor worker, no comorbidity"),
        ("Hypertension", "Low", "Well hydrated", "Controlled condition, indoor"),
        ("Diabetes", "Moderate", "Moderately hydrated", "Chronic condition"),
        ("Asthma", "High", "Dehydrated", "High exposure + dehydration"),
        ("Heart disease", "Moderate", "Dehydrated", "Cardiac vulnerability"),
        ("None", "High", "Dehydrated", "Dehydrated active youth"),
        ("Healthy", "Low", "Dehydrated", "Dehydration without comorbidity"),
    ]

    seen: set[tuple] = set()

    for heat, age, (health, activity, hydration, note) in itertools.product(
        heat_samples, age_samples, profiles
    ):
        key = (heat, age, health, activity, hydration)
        if key in seen:
            continue
        seen.add(key)

        risk = label_risk(heat, age, health, activity, hydration)
        rows.append(
            {
                "record_id": f"HH-{record_id:03d}",
                "heat_index": heat,
                "age": age,
                "health_condition": health,
                "activity_level": activity,
                "hydration_status": hydration,
                "risk_level": risk,
                "pagasa_band": pagasa_band(heat),
                "notes": note,
            }
        )
        record_id += 1

    # Extra random diverse rows
    random.seed(42)
    while len(rows) < 120:
        heat = random.choice([23, 27, 31, 33, 39, 42, 44, 50, 53])
        age = random.randint(5, 85)
        health = random.choice(HEALTH_CONDITIONS)
        activity = random.choice(ACTIVITY_LEVELS)
        hydration = random.choice(HYDRATION_STATUSES)
        key = (heat, age, health, activity, hydration)
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "record_id": f"HH-{record_id:03d}",
                "heat_index": heat,
                "age": age,
                "health_condition": health,
                "activity_level": activity,
                "hydration_status": hydration,
                "risk_level": label_risk(heat, age, health, activity, hydration),
                "pagasa_band": pagasa_band(heat),
                "notes": "Random synthetic profile",
            }
        )
        record_id += 1

    return rows


def write_csv(rows: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows -> {CSV_PATH}")


def write_xlsx(rows: list[dict]) -> None:
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
    except ImportError:
        print("openpyxl not installed — skipping .xlsx (CSV works in Excel)")
        return

    wb = Workbook()
    ws = wb.active
    ws.title = "Heat Risk Dataset"

    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF")

    ws.append(HEADERS)
    for col in range(1, len(HEADERS) + 1):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = header_font

    for row in rows:
        ws.append([row[h] for h in HEADERS])

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{chr(64 + len(HEADERS))}{len(rows) + 1}"

    # Column widths
    widths = [12, 12, 8, 18, 16, 22, 12, 28, 36]
    for i, width in enumerate(widths, start=1):
        ws.column_dimensions[chr(64 + i)].width = width

    wb.save(XLSX_PATH)
    print(f"Wrote {len(rows)} rows -> {XLSX_PATH}")


def main() -> None:
    rows = build_rows()
    write_csv(rows)
    write_xlsx(rows)

    counts: dict[str, int] = {}
    for row in rows:
        level = str(row["risk_level"])
        counts[level] = counts.get(level, 0) + 1
    print("Risk level distribution:", counts)


if __name__ == "__main__":
    main()
