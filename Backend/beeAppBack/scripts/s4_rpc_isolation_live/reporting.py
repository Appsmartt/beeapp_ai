class TestReporter:
    def __init__(self):
        self.results = []
        self.failures = 0

    def check(self, label, condition, detail):
        state = "PASS" if condition else "FAIL"
        self.failures += not condition
        self.results.append(f"{state} | {label} | {detail}")

    def fail(self, label, detail):
        self.check(label, False, detail)

    def warn(self, label, detail):
        self.results.append(f"WARN | {label} | {detail}")

    def skipped(self, label, reason):
        self.failures += 1
        self.results.append(f"FAIL | precondición {label} | {reason}")

    def output(self):
        lines = "\n".join(self.results)
        failures = sum(line.startswith("FAIL") for line in self.results)
        skipped = sum(line.startswith("SKIP") for line in self.results)
        return (
            f"{lines}\n"
            f"TOTAL | fallos={failures}; omitidas={skipped}"
        )

    @property
    def exit_code(self):
        return 1 if self.failures else 0
