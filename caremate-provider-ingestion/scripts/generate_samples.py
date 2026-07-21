#!/usr/bin/env python3
"""Generate Lagos sample workbook + per-sheet CSVs."""

from __future__ import annotations

import csv
from pathlib import Path

from openpyxl import Workbook

HEADERS = [
    "organization_id",
    "organization_name",
    "active",
    "phone",
    "email",
    "address_line",
    "city",
    "state",
    "postal_code",
    "country",
    "latitude",
    "longitude",
    "location_id",
    "location_name",
    "healthcare_service_id",
    "healthcare_service_name",
    "service_category",
    "specialty",
    "appointment_required",
    "attributes_json",
]

SHEETS: dict[str, list[list[str]]] = {
    "hospitals": [
        [
            "org-luth",
            "Lagos University Teaching Hospital (LUTH)",
            "true",
            "+234-1-2345001",
            "info@luth.gov.ng",
            "Idi-Araba",
            "Surulere",
            "Lagos",
            "101283",
            "NG",
            "6.5167",
            "3.3542",
            "loc-luth",
            "LUTH Main Campus",
            "hs-luth",
            "LUTH Acute Care Services",
            "27",
            "",
            "false",
            '{"emergencyDept":true,"beds":800}',
        ],
        [
            "org-lasuth",
            "Lagos State University Teaching Hospital",
            "true",
            "+234-1-2345002",
            "contact@lasuth.org.ng",
            "1-5 Oba Akinjobi Way",
            "Ikeja",
            "Lagos",
            "100271",
            "NG",
            "6.6018",
            "3.3515",
            "loc-lasuth",
            "LASUTH Ikeja",
            "hs-lasuth",
            "LASUTH Specialist Services",
            "27",
            "",
            "false",
            '{"emergencyDept":true,"traumaLevel":"I"}',
        ],
        [
            "org-redington",
            "Reddington Hospital Victoria Island",
            "true",
            "+234-1-2345003",
            "victoria@reddingtonhospital.com",
            "12 Idowu Martins Street",
            "Victoria Island",
            "Lagos",
            "101241",
            "NG",
            "6.4281",
            "3.4219",
            "loc-redington",
            "Reddington VI",
            "hs-redington",
            "Reddington Hospital Services",
            "27",
            "",
            "true",
            '{"emergencyDept":true}',
        ],
    ],
    "health_centers": [
        [
            "org-mushin-phc",
            "Mushin Primary Health Centre",
            "true",
            "+234-1-2345101",
            "",
            "Agege Motor Road",
            "Mushin",
            "Lagos",
            "",
            "NG",
            "6.5285",
            "3.3470",
            "loc-mushin-phc",
            "Mushin PHC",
            "hs-mushin-phc",
            "Primary Care Mushin",
            "17",
            "",
            "false",
            "{}",
        ],
        [
            "org-yaba-clinic",
            "Yaba Community Clinic",
            "true",
            "+234-1-2345102",
            "yaba@clinic.example",
            "Commercial Avenue",
            "Yaba",
            "Lagos",
            "",
            "NG",
            "6.5095",
            "3.3779",
            "loc-yaba-clinic",
            "Yaba Clinic",
            "hs-yaba-clinic",
            "Community Clinic Services",
            "17",
            "",
            "false",
            "{}",
        ],
    ],
    "dental_centre": [
        [
            "org-smile-lagos",
            "Smile Dental Centre Lagos",
            "true",
            "+234-1-2345201",
            "care@smiledental.example",
            "Adeola Odeku Street",
            "Victoria Island",
            "Lagos",
            "",
            "NG",
            "6.4300",
            "3.4200",
            "loc-smile-lagos",
            "Smile VI",
            "hs-smile-lagos",
            "General Dentistry",
            "8",
            "general_dentistry",
            "true",
            "{}",
        ],
        [
            "org-ikeja-dental",
            "Ikeja Dental Care",
            "true",
            "+234-1-2345202",
            "",
            "Allen Avenue",
            "Ikeja",
            "Lagos",
            "",
            "NG",
            "6.6010",
            "3.3510",
            "loc-ikeja-dental",
            "Ikeja Dental",
            "hs-ikeja-dental",
            "Dental Care Services",
            "8",
            "",
            "true",
            "{}",
        ],
    ],
    "eye": [
        [
            "org-eye-foundation",
            "Eye Foundation Hospital Lagos",
            "true",
            "+234-1-2345301",
            "appointments@eyefoundation.example",
            "27 Toyin Street",
            "Ikeja",
            "Lagos",
            "",
            "NG",
            "6.5980",
            "3.3490",
            "loc-eye-foundation",
            "Eye Foundation Ikeja",
            "hs-eye-foundation",
            "Ophthalmology Services",
            "17",
            "ophthalmology",
            "true",
            "{}",
        ],
        [
            "org-vcia-eye",
            "Vision Care Institute of Africa",
            "true",
            "+234-1-2345302",
            "",
            "Admiralty Way",
            "Lekki",
            "Lagos",
            "",
            "NG",
            "6.4474",
            "3.4723",
            "loc-vcia-eye",
            "VCIA Lekki",
            "hs-vcia-eye",
            "Vision Care Services",
            "17",
            "ophthalmology",
            "true",
            "{}",
        ],
    ],
}


def main() -> None:
    samples = Path(__file__).resolve().parent.parent / "samples"
    samples.mkdir(parents=True, exist_ok=True)

    wb = Workbook()
    default = wb.active
    wb.remove(default)

    for sheet_name, rows in SHEETS.items():
        ws = wb.create_sheet(sheet_name)
        ws.append(HEADERS)
        for row in rows:
            ws.append(row)

        csv_path = samples / f"ng_lagos_{sheet_name}.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            writer.writerow(HEADERS)
            writer.writerows(rows)
        print(f"wrote {csv_path.name}")

    xlsx_path = samples / "ng_lagos_providers.xlsx"
    wb.save(xlsx_path)
    print(f"wrote {xlsx_path.name}")


if __name__ == "__main__":
    main()
