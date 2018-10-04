import { yaml2env } from '@audit/utils/yaml-reader';

test("should load yaml props into process env", () => {
    yaml2env("./__tests__/spec.yml", "newtest");
    expect(process.env.PROP1).toBe("second");
    expect(process.env.PROP2).toBe("200");
});

