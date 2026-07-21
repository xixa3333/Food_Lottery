import importlib.util
import pathlib
import sys
import unittest

MODULE_PATH = pathlib.Path(__file__).parents[1] / "app" / "food_lottery.py"
SPEC = importlib.util.spec_from_file_location("food_lottery", MODULE_PATH)
food_lottery = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = food_lottery
SPEC.loader.exec_module(food_lottery)


class FoodLotteryTests(unittest.TestCase):
    def test_parse_node_and_way(self):
        payload = {"elements": [
            {"lat": 22.6, "lon": 120.3, "tags": {"name": "甲店", "amenity": "restaurant", "rating": "4.5"}},
            {"center": {"lat": 22.7, "lon": 120.4}, "tags": {"name": "乙店", "cuisine": "noodle"}},
            {"lat": 0, "lon": 0, "tags": {}},
        ]}
        venues = food_lottery.parse_venues(payload)
        self.assertEqual(["甲店", "乙店"], [venue.name for venue in venues])
        self.assertEqual(4.5, venues[0].rating)

    def test_filter_keyword_and_rating(self):
        venues = [
            food_lottery.Venue("紅火鍋", "hot_pot", 1, 1, 4.6),
            food_lottery.Venue("藍咖啡", "cafe", 1, 1, None),
        ]
        self.assertEqual(["紅火鍋"], [v.name for v in food_lottery.filter_venues(venues, "火鍋", 4)])
        self.assertEqual(2, len(food_lottery.filter_venues(venues, "", 0)))


if __name__ == "__main__":
    unittest.main()
