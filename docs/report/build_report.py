"""Compatibility entry point for the maintained full report."""
from build_figures import make_figures
from build_full_report import build_document, enable_field_updates, OUTPUT

if __name__ == '__main__':
    make_figures()
    document = build_document()
    enable_field_updates(document)
    document.save(OUTPUT)
    print(OUTPUT)
