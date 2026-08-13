import { describe, expect, it } from "vitest";

import {
  convertSpecificationUnit,
  INITIAL_SPECIFICATION_DEFINITIONS,
  parseSpecificationValues,
  SpecificationValidationError,
} from "@/src/modules/catalog/public/specifications";

describe("规格单位换算", () => {
  it("在毫米与英寸之间双向换算并按目标单位保留两位小数", () => {
    expect(
      convertSpecificationUnit({
        from: "millimetre",
        to: "inch",
        value: 96,
      }),
    ).toBe(3.78);
    expect(
      convertSpecificationUnit({
        from: "inch",
        to: "millimetre",
        value: 3.78,
      }),
    ).toBe(96.01);
  });

  it.each([
    {
      from: "kilopascal" as const,
      imperial: 1,
      metric: 6.89,
      to: "pound_per_square_inch" as const,
    },
    {
      from: "litre_per_minute" as const,
      imperial: 1,
      metric: 3.79,
      to: "us_gallon_per_minute" as const,
    },
    {
      from: "cubic_metre_per_minute" as const,
      imperial: 35.31,
      metric: 1,
      to: "cubic_foot_per_minute" as const,
    },
  ])("在 $from 与 $to 之间双向换算", ({ from, imperial, metric, to }) => {
    expect(convertSpecificationUnit({ from, to, value: metric })).toBe(
      imperial,
    );
    expect(
      convertSpecificationUnit({ from: to, to: from, value: imperial }),
    ).toBe(metric);
  });

  it("相同单位不换算但仍应用两位小数舍入约定", () => {
    expect(
      convertSpecificationUnit({
        from: "micrometre",
        to: "micrometre",
        value: 10.005,
      }),
    ).toBe(10.01);
  });

  it("拒绝跨物理量的单位换算", () => {
    expect(() =>
      convertSpecificationUnit({
        from: "millimetre",
        to: "pound_per_square_inch",
        value: 96,
      }),
    ).toThrow(RangeError);
  });
});

describe("分类规格属性定义", () => {
  it("为四类标准替换件提供约定的强类型初始字段", () => {
    expect(
      Object.fromEntries(
        Object.entries(INITIAL_SPECIFICATION_DEFINITIONS).map(
          ([category, definitions]) => [
            category,
            definitions.map(({ code }) => code),
          ],
        ),
      ),
    ).toEqual({
      air: [
        "outer_diameter",
        "inner_diameter",
        "height",
        "media_type",
        "rated_air_flow",
      ],
      cabin: ["length", "width", "height", "media_type", "rated_air_flow"],
      fuel: [
        "construction_type",
        "outer_diameter",
        "height",
        "connection_specification",
        "filtration_rating",
        "rated_flow",
        "water_separation",
      ],
      oil: [
        "construction_type",
        "outer_diameter",
        "inner_diameter",
        "height",
        "thread_specification",
        "bypass_valve_opening_pressure",
        "anti_drainback_valve",
      ],
    });

    expect(
      INITIAL_SPECIFICATION_DEFINITIONS.oil.find(
        ({ code }) => code === "bypass_valve_opening_pressure",
      ),
    ).toMatchObject({
      baseUnit: "kilopascal",
      dataType: "decimal",
      filterable: true,
      required: true,
    });
    expect(
      INITIAL_SPECIFICATION_DEFINITIONS.air.find(
        ({ code }) => code === "media_type",
      ),
    ).toMatchObject({
      baseUnit: null,
      dataType: "enumeration",
      filterable: true,
      options: expect.arrayContaining([
        expect.objectContaining({ code: "synthetic" }),
      ]),
      required: true,
    });
    expect(
      INITIAL_SPECIFICATION_DEFINITIONS.fuel.find(
        ({ code }) => code === "connection_specification",
      ),
    ).toMatchObject({
      baseUnit: null,
      dataType: "text",
      filterable: false,
      options: [],
      required: true,
    });
  });
});

describe("规格值服务端校验", () => {
  it("把合法的数值、枚举、文本和布尔输入解析为独立的持久化值列", () => {
    expect(
      parseSpecificationValues(INITIAL_SPECIFICATION_DEFINITIONS.fuel, [
        { attributeCode: "construction_type", value: "spin_on" },
        {
          attributeCode: "outer_diameter",
          unit: "millimetre",
          value: 96,
        },
        { attributeCode: "height", unit: "millimetre", value: 178 },
        { attributeCode: "connection_specification", value: "M16 × 1.5" },
        {
          attributeCode: "filtration_rating",
          unit: "micrometre",
          value: 10,
        },
        {
          attributeCode: "rated_flow",
          unit: "litre_per_minute",
          value: 5.2,
        },
        { attributeCode: "water_separation", value: true },
      ]),
    ).toEqual([
      {
        attributeCode: "construction_type",
        booleanValue: null,
        decimalValue: null,
        enumerationValue: "spin_on",
        textValue: null,
      },
      {
        attributeCode: "outer_diameter",
        booleanValue: null,
        decimalValue: 96,
        enumerationValue: null,
        textValue: null,
      },
      {
        attributeCode: "height",
        booleanValue: null,
        decimalValue: 178,
        enumerationValue: null,
        textValue: null,
      },
      {
        attributeCode: "connection_specification",
        booleanValue: null,
        decimalValue: null,
        enumerationValue: null,
        textValue: "M16 × 1.5",
      },
      {
        attributeCode: "filtration_rating",
        booleanValue: null,
        decimalValue: 10,
        enumerationValue: null,
        textValue: null,
      },
      {
        attributeCode: "rated_flow",
        booleanValue: null,
        decimalValue: 5.2,
        enumerationValue: null,
        textValue: null,
      },
      {
        attributeCode: "water_separation",
        booleanValue: true,
        decimalValue: null,
        enumerationValue: null,
        textValue: null,
      },
    ]);
  });

  it.each([
    {
      expectedCode: "invalid_value_type",
      invalidValue: {
        attributeCode: "outer_diameter",
        unit: "millimetre",
        value: "96",
      },
      validValue: {
        attributeCode: "outer_diameter",
        unit: "millimetre",
        value: 96,
      },
    },
    {
      expectedCode: "unit_mismatch",
      invalidValue: {
        attributeCode: "outer_diameter",
        unit: "inch",
        value: 3.78,
      },
      validValue: {
        attributeCode: "outer_diameter",
        unit: "millimetre",
        value: 96,
      },
    },
    {
      expectedCode: "invalid_enum_option",
      invalidValue: {
        attributeCode: "construction_type",
        value: "wire_mesh",
      },
      validValue: {
        attributeCode: "construction_type",
        value: "spin_on",
      },
    },
    {
      expectedCode: "unit_mismatch",
      invalidValue: {
        attributeCode: "connection_specification",
        unit: "millimetre",
        value: "M16 × 1.5",
      },
      validValue: {
        attributeCode: "connection_specification",
        value: "M16 × 1.5",
      },
    },
    {
      expectedCode: "invalid_value_type",
      invalidValue: {
        attributeCode: "water_separation",
        value: "yes",
      },
      validValue: {
        attributeCode: "water_separation",
        value: true,
      },
    },
  ])(
    "拒绝 $expectedCode 的规格输入",
    ({ expectedCode, invalidValue, validValue }) => {
      const validValues = [
        { attributeCode: "construction_type", value: "spin_on" },
        {
          attributeCode: "outer_diameter",
          unit: "millimetre",
          value: 96,
        },
        { attributeCode: "height", unit: "millimetre", value: 178 },
        { attributeCode: "connection_specification", value: "M16 × 1.5" },
        {
          attributeCode: "filtration_rating",
          unit: "micrometre",
          value: 10,
        },
        {
          attributeCode: "rated_flow",
          unit: "litre_per_minute",
          value: 5.2,
        },
        { attributeCode: "water_separation", value: true },
      ];
      const input = validValues.map((value) =>
        value.attributeCode === validValue.attributeCode ? invalidValue : value,
      );

      try {
        parseSpecificationValues(INITIAL_SPECIFICATION_DEFINITIONS.fuel, input);
        expect.unreachable("非法规格输入应被拒绝");
      } catch (error) {
        expect(error).toBeInstanceOf(SpecificationValidationError);
        expect(error).toMatchObject({ code: expectedCode });
      }
    },
  );

  it.each(["air", "oil", "fuel", "cabin"] as const)(
    "%s 分类拒绝缺少必填规格的产品数据",
    (category) => {
      try {
        parseSpecificationValues(
          INITIAL_SPECIFICATION_DEFINITIONS[category],
          [],
        );
        expect.unreachable("缺少必填规格的产品数据应被拒绝");
      } catch (error) {
        expect(error).toBeInstanceOf(SpecificationValidationError);
        expect(error).toMatchObject({ code: "required_attribute_missing" });
      }
    },
  );

  it("拒绝重复或不属于当前分类的规格属性", () => {
    expect(() =>
      parseSpecificationValues(INITIAL_SPECIFICATION_DEFINITIONS.air, [
        { attributeCode: "outer_diameter", unit: "millimetre", value: 285 },
        { attributeCode: "outer_diameter", unit: "millimetre", value: 286 },
      ]),
    ).toThrow(expect.objectContaining({ code: "duplicate_attribute" }));
    expect(() =>
      parseSpecificationValues(INITIAL_SPECIFICATION_DEFINITIONS.air, [
        { attributeCode: "thread_specification", value: "M27 × 2" },
      ]),
    ).toThrow(expect.objectContaining({ code: "unknown_attribute" }));
  });

  it("拒绝不可能的非正数尺寸与演示性能值", () => {
    const values = [
      { attributeCode: "outer_diameter", unit: "millimetre", value: -1 },
      { attributeCode: "inner_diameter", unit: "millimetre", value: 165 },
      { attributeCode: "height", unit: "millimetre", value: 480 },
      { attributeCode: "media_type", value: "synthetic" },
      {
        attributeCode: "rated_air_flow",
        unit: "cubic_metre_per_minute",
        value: 24,
      },
    ];

    expect(() =>
      parseSpecificationValues(INITIAL_SPECIFICATION_DEFINITIONS.air, values),
    ).toThrow(expect.objectContaining({ code: "invalid_number_range" }));
  });
});
