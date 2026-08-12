"""
Train HeatHits Decision Tree from ml/data/heat_risk_dataset.csv

Run from repo root:
  cd ml
  pip install pandas scikit-learn matplotlib openpyxl
  python train_decision_tree.py
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree

DATA_PATH = Path(__file__).parent / "data" / "heat_risk_dataset.csv"
OUTPUT_DIR = Path(__file__).parent / "output"

FEATURE_COLUMNS = [
    "heat_index",
    "age",
    "health_condition",
    "activity_level",
    "hydration_status",
]
TARGET_COLUMN = "risk_level"


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Missing {DATA_PATH}. Run: python ml/generate_dataset.py"
        )

    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", ["heat_index", "age"]),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                ["health_condition", "activity_level", "hydration_status"],
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("prep", preprocessor),
            (
                "tree",
                DecisionTreeClassifier(
                    max_depth=6,
                    min_samples_leaf=2,
                    random_state=42,
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Confusion Matrix ===")
    labels = sorted(y.unique())
    print(confusion_matrix(y_test, y_pred, labels=labels))
    print("\nLabels order:", labels)

    print("\n=== Classification Report ===")
    print(classification_report(y_test, y_pred))

    tree = model.named_steps["tree"]
    feature_names = model.named_steps["prep"].get_feature_names_out()
    rules = export_text(tree, feature_names=list(feature_names))

    rules_path = OUTPUT_DIR / "rules.txt"
    rules_path.write_text(rules, encoding="utf-8")
    print(f"\nRules saved -> {rules_path}")

    try:
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(24, 12))
        plot_tree(
            tree,
            feature_names=list(feature_names),
            class_names=tree.classes_,
            filled=True,
            rounded=True,
            fontsize=8,
            ax=ax,
        )
        fig.tight_layout()
        png_path = OUTPUT_DIR / "tree.png"
        fig.savefig(png_path, dpi=150)
        plt.close(fig)
        print(f"Tree diagram saved -> {png_path}")
    except Exception as exc:
        print(f"Could not save tree.png: {exc}")

    sample = X_test.copy()
    sample["actual"] = y_test.values
    sample["predicted"] = y_pred
    sample_path = OUTPUT_DIR / "sample_predictions.csv"
    sample.to_csv(sample_path, index=False)
    print(f"Sample predictions -> {sample_path}")


if __name__ == "__main__":
    main()
