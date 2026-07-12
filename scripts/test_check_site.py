import unittest

from scripts.check_site import css_syntax_errors


class CssSyntaxTests(unittest.TestCase):
    def scan(self, css: str) -> list[str]:
        return css_syntax_errors(css, "test.css")

    def test_valid_css(self) -> None:
        self.assertEqual(self.scan("body { color: red; }"), [])

    def test_brace_in_comment(self) -> None:
        self.assertEqual(self.scan("/* } */\nbody { color: red; }"), [])

    def test_brace_in_string(self) -> None:
        self.assertEqual(self.scan('p::before { content: "}"; }'), [])

    def test_isolated_closing_brace_after_multiline_comment(self) -> None:
        self.assertEqual(
            self.scan("/* comment\n   suite */\n}"),
            ["Unmatched closing CSS brace in test.css:3"],
        )

    def test_unclosed_block(self) -> None:
        self.assertEqual(
            self.scan("body {\n  color: red;"),
            ["Unclosed CSS block in test.css:1"],
        )


if __name__ == "__main__":
    unittest.main()
