#!/usr/bin/env python3
"""Merge ui_* keys into frontend/src/locales/en.json (run from repo root)."""

import json
from pathlib import Path

EXTRAS: dict[str, str] = {
    "ui_admin_dashboard_subtitle": "Snapshot of catalog, commerce, and admin content stored in this browser.",
    "ui_metric_published_courses": "Published courses",
    "ui_metric_total_courses": "Total courses",
    "ui_metric_categories": "Categories",
    "ui_metric_demo_enrollments": "Demo enrollments",
    "ui_metric_certificates_issued": "Certificates issued",
    "ui_metric_media_assets": "Media assets",
    "ui_metric_tests_configured": "Tests configured",
    "ui_metric_announcements": "Announcements",
    "ui_metric_orders_local": "Orders (local)",
    "ui_admin_data_lives_in": "Admin data lives in",
    "ui_admin_use": "Use",
    "ui_admin_orders_lists_suffix": "lists enrollments from this device.",
    "ui_spinner_loading_metrics": "Loading metrics",
    "ui_checkout_stripe_body": "Stripe Checkout or Payment Element will open here. Webhooks will grant course access after payment succeeds.",
    "ui_checkout_course_label": "Course: {{slug}}",
    "ui_checkout_pay_stripe": "Purchase Now",
    "ui_checkout_back_catalog": "Back to catalog",
    "ui_mycourses_resume": "Resume slide {{slide}} of {{total}}",
    "ui_not_started": "Not started",
    "ui_continue": "Continue",
    "ui_start": "Start",
    "ui_mycourses_catalog_cache": "Catalog cache: {{count}} published courses.",
    "ui_footer_copyright": "© {{year}} ABC Safety Solutions, Inc.",
    "ui_users_builtin": "Built-in demo",
    "ui_users_added_local": "Added locally",
    "ui_tests_question_label": "Question {{n}}",
    "ui_courses_slide_label": "Slide {{n}}",
    "ui_media_upload": "Upload",
    "ui_media_url": "URL",
    "ui_media_intro": "Upload files to the server or add an external HTTPS URL.",
    "ui_media_empty": "No media yet. Upload an image or paste a CDN URL.",
    "ui_course_detail_back": "Back to catalog",
    "ui_course_detail_back_arrow": "← Back to catalog",
    "ui_login_continue_slides": "Continue slides, tests, and credentials from one dashboard.",
    "ui_login_continue_btn": "Continue",
    "ui_learn_upload_hint": "Upload slide images in Admin → Courses to show frames here.",
    "ui_orders_mark_refunded": "Mark refunded (demo)",
    "ui_orders_mark_not_refunded": "Mark not refunded",
    "ui_em_dash": "—",
    "ui_courses_status_published": "Published",
    "ui_courses_status_draft": "Draft",
    "ui_courses_unpublish": "Unpublish",
    "ui_courses_publish": "Publish",
    "ui_tests_modal_build": "Build test",
    "ui_tests_modal_edit": "Edit test",
    "ui_course_nav_courses": "Courses",
    "ui_course_estimated_hours": "Estimated {{hours}} hours · self-paced",
    "ui_course_slides_voice": "{{count}} slides with voice-over (demo player)",
    "ui_course_knowledge_cert": "Knowledge check + certificate upon passing",
    "ui_course_local_demo_payment": "Local demo: no payment processor. Purchase is saved in this browser only.",
    "ui_course_preview_checkout": "Preview checkout UI →",
    "ui_course_enroll_demo": "Enroll (demo)",
    "ui_course_signin_enroll": "Sign in to enroll",
    "ui_forgot_back_signin": "← Back to sign in",
    "ui_learn_voice_placeholder": "Voice-over plays here in production. Placeholder for slide {{n}}.",
    "ui_login_learning_hub": "Learning hub",
    "ui_login_welcome_back": "Welcome back",
    "ui_login_hero_sub": "Sign in to resume courses, knowledge checks, and certificates—built for teams who train between job sites.",
    "ui_login_session_stored": "Session stored in",
    "ui_login_production_auth": "—production will use NestJS auth.",
    "ui_login_signin_badge": "Sign in",
    "ui_login_demo_accounts_blurb": "Demo accounts use a password; any other email signs in without one for quick testing.",
    "ui_login_demo_label": "Demo",
    "ui_login_apply_learner": "Apply learner",
    "ui_login_apply_admin": "Apply admin",
    "ui_login_label_full_name": "Full name",
    "ui_login_label_email": "Email",
    "ui_login_label_password": "Password",
    "ui_login_forgot": "Forgot password?",
    "ui_login_new_here": "New here?",
    "ui_login_create_account": "Create an account",
    "ui_orders_close_detail": "Close detail",
    "ui_tests_status_live": "Live",
    "ui_tests_status_draft": "Draft",
    "ui_tests_add_question": "Add question",
    "ui_courses_source_seed": "Seed",
    "ui_courses_source_custom": "Custom",
    "ui_courses_edit": "Edit",
    "ui_courses_delete": "Delete",
    "ui_courses_modal_add": "Add course",
    "ui_courses_modal_edit": "Edit course",
    "ui_courses_seed_banner": "Seed course: ID and slug stay fixed; other fields save as overrides until the API ships.",
    "ui_media_add_asset": "Add asset",
    "ui_media_inline_data": "(inline data)",
}


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    p = root / "frontend" / "src" / "locales" / "en.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    data.update(EXTRAS)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Merged {len(EXTRAS)} keys into {p}")


if __name__ == "__main__":
    main()
