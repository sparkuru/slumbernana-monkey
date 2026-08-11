# -*- coding: utf-8 -*-

CONSTANT = "github.com#?#div.Box-sc-{}.{}:-abp-has(a:-abp-contains({}))"
TITLE = "62in7e-0"
KEYWORDS = [
    "fXzjPH",
    "eLyVAI"
]

shit_path = "crap"

BANLIST = []
with open(shit_path, "r") as f:
    BANLIST.extend(f.read().splitlines())
for keyword in KEYWORDS:
    [print(CONSTANT.format(TITLE, keyword, x)) for x in BANLIST]
