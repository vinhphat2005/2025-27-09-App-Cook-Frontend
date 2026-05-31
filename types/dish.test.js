const {
  getDifficultyDisplay,
  mapDifficultyToEnglish,
  normalizeDish,
  normalizeDishList,
} = require("./dish");

describe("dish normalization", () => {
  it("maps Vietnamese difficulty labels to backend values", () => {
    expect(mapDifficultyToEnglish("Dễ")).toBe("easy");
    expect(mapDifficultyToEnglish("Trung bình")).toBe("medium");
    expect(mapDifficultyToEnglish("Khó")).toBe("hard");
  });

  it("normalizes a single backend dish", () => {
    expect(
      normalizeDish({
        id: "dish-1",
        name: "Fried rice",
        image_url: "https://example.com/rice.jpg",
        cooking_time: 20,
        average_rating: 4.5,
        difficulty: "medium",
        ingredients: ["rice", "egg"],
      }),
    ).toMatchObject({
      id: "dish-1",
      label: "Fried rice",
      time: "20 phút",
      star: 4.5,
      level: "medium",
      ingredients: ["rice", "egg"],
    });
  });

  it("normalizes dish lists without deriving difficulty from cooking time", () => {
    const [dish] = normalizeDishList([
      {
        id: "dish-2",
        name: "Slow stew",
        image_url: "",
        cooking_time: 90,
        average_rating: 4,
        difficulty: "easy",
      },
    ]);

    expect(dish.level).toBe("easy");
    expect(getDifficultyDisplay(dish.level)).toBe("Dễ");
  });
});
