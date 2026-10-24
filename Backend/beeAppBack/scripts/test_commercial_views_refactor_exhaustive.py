#!/usr/bin/env python
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]
OUTPUT_DIRECTORY = REPOSITORY_ROOT / "tmp" / "commercial_views_refactor"
REPORT_PATH = OUTPUT_DIRECTORY / "commercial_views_refactor_exhaustive_report.txt"
VIEWS_DIRECTORY = PROJECT_ROOT / "apps" / "commercial" / "views"
MONOLITH_PATH = PROJECT_ROOT / "apps" / "commercial" / "views.py"

EXPECTED_VIEWS = {
    "CommercialCategoriesView": "profile_category_views",
    "CommercialProfilesView": "profile_management_views",
    "CommercialProfileDetailView": "profile_management_views",
    "CommercialProfilePublicationView": "profile_publication_chat_views",
    "CommercialProfileChatView": "profile_publication_chat_views",
    "CommercialProfileCatalogsView": "catalog_query_views",
    "CommercialProfileCatalogDetailView": "catalog_query_views",
    "CommercialProfileCatalogArchiveView": "catalog_state_views",
    "CommercialProfileCatalogRestoreView": "catalog_state_views",
    "CommercialProfileCatalogPauseView": "catalog_state_views",
    "CommercialProfileCatalogPublishView": "catalog_state_views",
    "CommercialProfileOffersView": "offer_query_views",
    "CommercialProfileOfferDetailView": "offer_query_views",
    "CommercialProfileOfferPauseView": "offer_state_views",
    "CommercialProfileOfferPublishView": "offer_state_views",
    "CommercialProfileOfferArchiveView": "offer_state_views",
    "CommercialProfileOfferRestoreView": "offer_state_views",
    "CommercialProfileOfferEnableView": "offer_state_views",
    "CommercialProfileOfferDisableView": "offer_state_views",
    "CommercialProfileOfferInventoryAdjustView": "offer_configuration_views",
    "CommercialProfileOfferModalitiesView": "offer_configuration_views",
    "CommercialPublicImageUploadView": "offer_upload_views",
    "CommercialProfileOfferImagesView": "offer_upload_views",
    "CommercialProfileOfferImageArchiveView": "offer_image_state_views",
    "CommercialProfileOfferImageRestoreView": "offer_image_state_views",
    "CommercialProfileOfferImageSetPrimaryView": "offer_image_state_views",
    "CommercialProfileOfferImageDetailView": "offer_image_detail_views",
    "CommercialProfileAuditEventsView": "audit_views",
    "PublicCommercialCountriesView": "public_location_views",
    "PublicCommercialCitiesView": "public_location_views",
    "PublicCommercialCategoriesView": "public_location_views",
    "PublicCommercialProfilesView": "public_profile_views",
    "PublicCommercialProfileDetailView": "public_profile_views",
    "PublicCommercialCatalogsView": "public_profile_views",
    "PublicCommercialProductFeedView": "public_offer_views",
    "PublicCommercialOffersView": "public_offer_views",
    "PublicCommercialOfferDetailView": "public_offer_views",
    "CommercialProfilePaymentMethodsView": "payment_method_views",
    "CommercialProfilePaymentMethodDetailView": "payment_method_views",
    "CommercialProfilePaymentMethodArchiveView": "payment_method_views",
}

EXPECTED_MODULES = set(EXPECTED_VIEWS.values())


def write_result(report, label, passed, detail):
    report.append(f"{'PASS' if passed else 'FAIL'} | {label} | {detail}")
    return passed


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")

    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

    import django

    django.setup()

    from apps.commercial import urls
    from apps.commercial import views

    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    report = []
    passed = True

    passed &= write_result(
        report,
        "monolith_removed",
        not MONOLITH_PATH.exists(),
        str(MONOLITH_PATH),
    )

    python_files = sorted(VIEWS_DIRECTORY.glob("*.py"))
    module_files = {
        python_file.stem
        for python_file in python_files
        if python_file.stem != "__init__"
    }
    passed &= write_result(
        report,
        "expected_modules",
        EXPECTED_MODULES.issubset(module_files),
        f"missing={sorted(EXPECTED_MODULES - module_files)}",
    )

    for python_file in python_files:
        line_count = len(
            python_file.read_text(encoding="utf-8").splitlines()
        )
        passed &= write_result(
            report,
            "line_limit",
            line_count <= 400,
            f"{python_file.relative_to(PROJECT_ROOT)}={line_count}",
        )

    missing_views = [
        name for name in EXPECTED_VIEWS if not hasattr(views, name)
    ]
    invalid_views = [
        name
        for name in EXPECTED_VIEWS
        if hasattr(views, name)
        and not isinstance(getattr(views, name), type)
    ]
    passed &= write_result(
        report,
        "public_views",
        not missing_views and not invalid_views,
        f"missing={missing_views}; invalid={invalid_views}",
    )

    invalid_modules = []
    for name, module_name in EXPECTED_VIEWS.items():
        if hasattr(views, name):
            expected_module = f"apps.commercial.views.{module_name}"
            actual_module = getattr(views, name).__module__
            if actual_module != expected_module:
                invalid_modules.append(f"{name}={actual_module}")

    passed &= write_result(
        report,
        "view_modules",
        not invalid_modules,
        f"invalid={invalid_modules}",
    )

    url_names = [pattern.name for pattern in urls.urlpatterns]
    callbacks_callable = all(
        callable(pattern.callback) for pattern in urls.urlpatterns
    )
    passed &= write_result(
        report,
        "url_contract",
        len(urls.urlpatterns) == 68
        and len(url_names) == len(set(url_names))
        and callbacks_callable,
        (
            f"count={len(urls.urlpatterns)}; "
            f"unique={len(set(url_names))}; "
            f"callbacks_callable={callbacks_callable}"
        ),
    )

    report.append(
        f"RESULT | {'PASS' if passed else 'FAIL'} | "
        f"views={len(EXPECTED_VIEWS)}; urls={len(urls.urlpatterns)}"
    )
    REPORT_PATH.write_text(
        "\n".join(report) + "\n",
        encoding="utf-8",
    )
    print(REPORT_PATH)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
