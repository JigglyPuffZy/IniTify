"""
Validate IniTify decision-tree rules against heat_risk_dataset.csv.

Uses the same expert-labeling logic as the app rules file.
"""

from __future__ import annotations

import csv
from pathlib import Path

CSV_PATH = Path(__file__).parent / "data" / "heat_risk_dataset.csv"


def has_health_risk(health: str) -> bool:
    return health.strip().lower() not in {
        "none",
        "n/a",
        "no condition",
        "healthy",
        "",
    }


def label_risk(
    heat_index: float, age: int, health: str, activity: str, hydration: str
) -> str:
    if heat_index >= 42:
        return "EXTREME"

    factors = 0
    if age >= 60:
        factors += 1
    if has_health_risk(health):
        factors += 1
    if activity == "High":
        factors += 1
    if hydration == "Dehydrated":
        factors += 1

    if heat_index >= 33:
        return "EXTREME" if factors >= 1 else "HIGH"
    if heat_index >= 27:
        return "HIGH" if factors >= 1 else "MODERATE"
    return "MODERATE" if factors >= 1 else "LOW"


def main() -> None:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    mismatches = []

    for row in rows:
        predicted = label_risk(
            float(row["heat_index"]),
            int(row["age"]),
            row["health_condition"],
            row["activity_level"],
            row["hydration_status"],
        )
        if predicted != row["risk_level"]:
            mismatches.append((row["record_id"], row["risk_level"], predicted))

    print(f"Rows checked: {len(rows)}")
    print(f"Mismatches: {len(mismatches)}")
    if mismatches:
        for m in mismatches[:10]:
            print(" ", m)
    else:
        print("App decision tree logic matches 100% of dataset labels.")


if __name__ == "__main__":
    main()
