#!/usr/bin/env python3
"""Emit catalog + brand program keys for en.json / es.json (merge manually or via merge script)."""

from __future__ import annotations

import json
from pathlib import Path

# Mirrors frontend/src/data/catalog.ts categories
CATEGORIES: list[tuple[str, str, str]] = [
    (
        "cat-ohs",
        "Occupational Health & Safety",
        "Occupational health & safety training program completed in accordance with applicable workplace safety standards.",
    ),
    (
        "cat-dot",
        "Department of Transportation (DOT)",
        "Department of Transportation (DOT) training completed for regulated hazardous materials and fleet safety topics.",
    ),
    (
        "cat-me",
        "Major Emergency Training",
        "Major emergency preparedness training completed for industrial emergency response and incident coordination.",
    ),
    (
        "cat-fire",
        "Fire Training",
        "Fire prevention and response training completed for workplace fire safety and emergency action.",
    ),
    (
        "cat-surv",
        "Survival Training",
        "Survival and offshore safety training completed for marine and aviation travel environments.",
    ),
    (
        "cat-bop",
        "BOP Controls Training",
        "Well control and blowout prevention awareness training completed for oilfield operations.",
    ),
    (
        "cat-epa",
        "EPA Lead-Safe Training",
        "EPA lead-safe renovation, repair, and painting training completed in accordance with RRP requirements.",
    ),
]

# (slug, title, summary) — mirrors c(...) rows in catalog.ts
COURSES: list[tuple[str, str, str]] = [
    ("osha-10-awareness", "OSHA 10-Hour Awareness (Online)", "Core workplace safety awareness aligned with common OSHA outreach topics."),
    ("osha-30-supervisor", "OSHA 30-Hour Supervisor Orientation", "Deeper coverage for supervisors and safety leads."),
    ("hazwoper-8-refresher", "HAZWOPER 8-Hour Refresher", "Annual refresher for hazardous waste site workers."),
    ("hazcom-ghs", "Hazard Communication & GHS", "Labels, SDS, and employee right-to-know essentials."),
    ("confined-space-awareness", "Confined Space Awareness", "Identify permit-required confined spaces and basic roles."),
    ("fall-protection-user", "Fall Protection — Authorized User", "Harnesses, anchor points, and fall prevention fundamentals."),
    ("dot-hazmat-awareness", "DOT Hazmat Awareness", "Shipping papers, markings, and emergency response awareness."),
    ("defensive-driving", "Defensive Driving Fundamentals", "Roadway hazards and safe driving habits for work fleets."),
    ("emergency-response-ics", "Emergency Response & ICS Basics", "Incident command concepts for industrial emergency teams."),
    ("fire-extinguisher", "Portable Fire Extinguisher Use", "Classes of fire, PASS method, and evacuation mindset."),
    ("hot-work-fire-watch", "Hot Work & Fire Watch", "Permits, hazards, and watch responsibilities."),
    ("sea-survival-awareness", "Sea Survival Awareness", "Cold water immersion basics and survival priorities."),
    ("helicopter-safety", "Helicopter Passenger Safety", "Embark/debark, PPE, and offshore travel safety."),
    ("well-control-awareness", "Well Control Awareness", "Kick detection concepts and shut-in awareness for field staff."),
    ("rrp-renovator", "EPA RRP — Renovator Essentials", "Lead-safe work practices for renovation, repair, and painting."),
    ("silica-awareness", "Silica Exposure Awareness", "Table 1 concepts and exposure control basics."),
    ("loto-affected", "Lockout/Tagout — Affected Employee", "Energy control procedures and communication."),
    ("electrical-safety", "Electrical Safety — Unqualified Person", "Boundaries, PPE, and reporting unsafe conditions."),
    ("h2s-awareness", "Hydrogen Sulfide (H₂S) Awareness", "Properties of H₂S, detection, and emergency response."),
    ("excavation-trenching", "Excavation & Trenching Safety", "Soil types, protective systems, and competent person concepts."),
]

DESC_SUFFIX = (
    " This self-paced module includes slide-based instruction with voice-over, a knowledge check, "
    "and a certificate of completion upon passing."
)

# Spanish (professional safety-training tone)
CAT_ES: dict[str, tuple[str, str]] = {
    "cat-ohs": (
        "Salud y seguridad ocupacional",
        "Programa de salud y seguridad ocupacional completado conforme a las normas de seguridad laboral aplicables.",
    ),
    "cat-dot": (
        "Departamento de Transporte (DOT)",
        "Formación DOT completada sobre materiales peligrosos regulados y seguridad de flotas.",
    ),
    "cat-me": (
        "Formación ante emergencias mayores",
        "Formación completada en preparación ante emergencias industriales y coordinación de incidentes.",
    ),
    "cat-fire": (
        "Formación contra incendios",
        "Formación en prevención y respuesta ante incendios para seguridad laboral y acción de emergencia.",
    ),
    "cat-surv": (
        "Formación en supervivencia",
        "Formación en supervivencia y seguridad offshore completada para entornos marítimos y aéreos.",
    ),
    "cat-bop": (
        "Formación en controles BOP",
        "Formación de concienciación en control de pozos y prevención de blowouts para operaciones de campo.",
    ),
    "cat-epa": (
        "Formación EPA Lead-Safe",
        "Formación EPA en renovación, reparación y pintura sin plomo conforme a los requisitos RRP.",
    ),
}

# slug -> (title_es, summary_es) — concise professional ES
COURSE_ES: dict[str, tuple[str, str]] = {
    "osha-10-awareness": (
        "Concienciación OSHA 10 horas (en línea)",
        "Concienciación básica en seguridad laboral alineada con temas comunes OSHA.",
    ),
    "osha-30-supervisor": (
        "Orientación OSHA 30 horas para supervisores",
        "Cobertura más profunda para supervisores y responsables de seguridad.",
    ),
    "hazwoper-8-refresher": (
        "Actualización HAZWOPER de 8 horas",
        "Actualización anual para trabajadores en sitios de residuos peligrosos.",
    ),
    "hazcom-ghs": (
        "Comunicación de peligros y GHS",
        "Etiquetas, FDS y derecho a saber del empleado.",
    ),
    "confined-space-awareness": (
        "Concienciación en espacios confinados",
        "Identificar espacios confinados con permiso y roles básicos.",
    ),
    "fall-protection-user": (
        "Protección contra caídas — usuario autorizado",
        "Arneses, puntos de anclaje y fundamentos de prevención de caídas.",
    ),
    "dot-hazmat-awareness": (
        "Concienciación en materiales peligrosos DOT",
        "Documentos de envío, marcas y concienciación en respuesta de emergencia.",
    ),
    "defensive-driving": (
        "Fundamentos de conducción defensiva",
        "Riesgos en carretera y hábitos seguros para flotas laborales.",
    ),
    "emergency-response-ics": (
        "Respuesta de emergencia y conceptos SCI",
        "Conceptos de mando de incidentes para equipos de emergencia industrial.",
    ),
    "fire-extinguisher": (
        "Uso de extintores portátiles",
        "Clases de fuego, método PASS y mentalidad de evacuación.",
    ),
    "hot-work-fire-watch": (
        "Trabajo en caliente y vigía de incendios",
        "Permisos, peligros y responsabilidades del vigía.",
    ),
    "sea-survival-awareness": (
        "Concienciación en supervivencia en el mar",
        "Inmersión en agua fría y prioridades de supervivencia.",
    ),
    "helicopter-safety": (
        "Seguridad de pasajeros en helicóptero",
        "Embarque, EPP y seguridad en viajes offshore.",
    ),
    "well-control-awareness": (
        "Concienciación en control de pozos",
        "Detección de kicks y concienciación en cierre para personal de campo.",
    ),
    "rrp-renovator": (
        "EPA RRP — esenciales para renovadores",
        "Prácticas de trabajo sin plomo para renovación, reparación y pintura.",
    ),
    "silica-awareness": (
        "Concienciación en exposición a sílice",
        "Conceptos de la Tabla 1 y control de exposición.",
    ),
    "loto-affected": (
        "Bloqueo/Etiquetado — empleado afectado",
        "Procedimientos de control de energía y comunicación.",
    ),
    "electrical-safety": (
        "Seguridad eléctrica — persona no cualificada",
        "Límites, EPP y reporte de condiciones inseguras.",
    ),
    "h2s-awareness": (
        "Concienciación en sulfuro de hidrógeno (H₂S)",
        "Propiedades del H₂S, detección y respuesta de emergencia.",
    ),
    "excavation-trenching": (
        "Seguridad en excavación y zanjas",
        "Tipos de suelo, sistemas de protección y conceptos de persona competente.",
    ),
}


def slug_key(slug: str) -> str:
    return slug.replace("-", "_")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    en_extra: dict[str, str] = {}
    es_extra: dict[str, str] = {}

    for cid, name, cert in CATEGORIES:
        kid = cid.replace("cat-", "")
        en_extra[f"catalog_cat_{kid}_name"] = name
        en_extra[f"catalog_cat_{kid}_cert"] = cert
        n_es, c_es = CAT_ES[cid]
        es_extra[f"catalog_cat_{kid}_name"] = n_es
        es_extra[f"catalog_cat_{kid}_cert"] = c_es

    for slug, title, summary in COURSES:
        sk = slug_key(slug)
        en_extra[f"catalog_course_{sk}_title"] = title
        en_extra[f"catalog_course_{sk}_summary"] = summary
        en_extra[f"catalog_course_{sk}_description"] = summary + DESC_SUFFIX
        t_es, s_es = COURSE_ES[slug]
        es_extra[f"catalog_course_{sk}_title"] = t_es
        es_extra[f"catalog_course_{sk}_summary"] = s_es
        es_extra[f"catalog_course_{sk}_description"] = (
            s_es
            + " Este módulo a su ritmo incluye instrucción en diapositivas con voz en off, "
            "una evaluación de conocimientos y un certificado de finalización al aprobar."
        )

    # Brand program tiles (brandAssets trainingProgramTiles)
    BRAND = [
        ("0", "Occupational Safety & Health Training", "Occupational Health & Safety"),
        ("1", "Department of Transportation (DOT) Training", "DOT Training"),
        ("2", "Major Emergency Training", "Major Emergency"),
        ("3", "Fire Training", "Fire Training"),
        ("4", "Survival Training", "Survival Training"),
        ("5", "BOP Controls Training", "BOP Controls"),
        ("6", "EPA Lead-Safe Training & Certificates", "EPA Lead-Safe"),
    ]
    BRAND_ES = [
        ("Formación en salud y seguridad ocupacional", "Salud y seguridad ocupacional"),
        ("Formación del Departamento de Transporte (DOT)", "Formación DOT"),
        ("Formación ante emergencias mayores", "Emergencia mayor"),
        ("Formación contra incendios", "Incendios"),
        ("Formación en supervivencia", "Supervivencia"),
        ("Formación en controles BOP", "Controles BOP"),
        ("Formación EPA Lead-Safe y certificados", "EPA Lead-Safe"),
    ]
    for i, ((_, en_t, en_s), (es_t, es_s)) in enumerate(zip(BRAND, BRAND_ES, strict=True)):
        en_extra[f"ui_brand_program_{i}_title"] = en_t
        en_extra[f"ui_brand_program_{i}_short"] = en_s
        es_extra[f"ui_brand_program_{i}_title"] = es_t
        es_extra[f"ui_brand_program_{i}_short"] = es_s

    en_extra["ui_brand_program_epa_note"] = (
        "Offered in conjunction with an affiliated training service provider where applicable."
    )
    es_extra["ui_brand_program_epa_note"] = (
        "Ofrecido junto con un proveedor de formación afiliado cuando corresponda."
    )

    out = root / "reports" / "catalog_i18n_generated.json"
    out.write_text(
        json.dumps({"en": en_extra, "es": es_extra}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {out} ({len(en_extra)} en keys, {len(es_extra)} es keys)")


if __name__ == "__main__":
    main()
