```
title: Example arithmetic support module
summary: Shared helpers imported by the VS Code syntax-tour fixture.
```

fn add2(lhs: i32, rhs: i32) -> i32:
  ```
  title: add2
  summary: Returns the sum of two integer values.
  ```
  return lhs + rhs

fn scale(value: i32, factor: i32 = 2) -> i32:
  ```
  title: scale
  summary: Multiplies one integer value by an optional factor.
  ```
  return value * factor
