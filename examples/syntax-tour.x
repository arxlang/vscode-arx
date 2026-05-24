```
title: Arx VS Code syntax tour
summary: Dummy source that exercises current Arx syntax highlighting surfaces.
```

# Import forms: namespace aliases, named aliases, grouped imports, and stdlib.
import examples.support.arithmetic as arithmetic
import add2 as plus from examples.support.arithmetic
import (
  sum3,
  doubled as twice,
) from examples.support.stats
import math as maths from stdlib

# Top-level aliases, including union and collection types.
type Scalar = i32 | f64
type IdentifierList = list[i32]
type ScoreRows = dataframe[id: i32, score: f64, active: bool]
type ScoreSeries = series[f64]
type Grid = tensor[i32, 2, 2]

# Extern prototypes and runtime-layout parameter types.
extern clock_ticks() -> i64
extern consume_rows(rows: dataframe[...]) -> none
extern consume_tensor(values: tensor[i32, ...]) -> none

@[public, abstract]
class Shape:
  ```
  title: Shape
  summary: Abstract base class for class, annotation, and method syntax.
  ```
  @[public, abstract]
  fn area(self) -> i32:
    ```
    title: area
    summary: Abstract docstring-only method body.
    ```

  @[public]
  fn native_area(self) -> i32:
    ```
    title: native_area
    summary: Placeholder method that mirrors an external native hook.
    ```
    return 0

class BaseCounter:
  ```
  title: BaseCounter
  summary: Holds inherited fields and a protected method.
  ```
  @[public, mutable]
  value: int32 = 41

  @[protected]
  fn read_seed(self) -> int32:
    ```
    title: read_seed
    summary: Returns the inherited public field.
    ```
    return self.value

class Counter(BaseCounter):
  ```
  title: Counter
  summary: Extends BaseCounter with field modifiers and methods.
  ```
  @[public, static, constant]
  version: int32 = 3

  @[private, mutable]
  internal: int32 = 5

  @[protected]
  fn internal_total(self) -> int32:
    ```
    title: internal_total
    summary: Combines private and inherited state.
    ```
    return self.internal + self.value

  @[public]
  fn get(self) -> int32:
    ```
    title: get
    summary: Returns one field through instance field access.
    ```
    return self.value

  @[public]
  fn read_internal(self) -> int32:
    ```
    title: read_internal
    summary: Calls a protected instance method.
    ```
    return self.internal_total()

class Factory:
  ```
  title: Factory
  summary: Demonstrates static methods and explicit template calls.
  ```
  @[public, static]
  fn make_counter() -> Counter:
    ```
    title: make_counter
    summary: Constructs one class instance.
    ```
    return Counter()

  @<T: i32 | f64>
  @[public, static]
  fn identity(value: T) -> T:
    ```
    title: identity
    summary: Returns one generic value unchanged.
    ```
    return value

@<
  T: i32 | f64,
>
fn add_generic(lhs: T, rhs: T) -> T:
  ```
  title: add_generic
  summary: Generic function with a multi-line template parameter block.
  ```
  return lhs + rhs

fn add_offset(value: i32, offset: i32 = 1) -> i32:
  ```
  title: add_offset
  summary: Demonstrates default parameters and arithmetic.
  ```
  return value + offset

fn choose(flag: bool, when_true: i32, when_false: i32) -> i32:
  ```
  title: choose
  summary: Demonstrates if/else branches and logical operators.
  ```
  if flag && true:
    return when_true
  else:
    if flag or false:
      return when_true
    else:
      return when_false

fn accept_runtime(values: tensor[i32, ...], rows: dataframe[...]) -> none:
  ```
  title: accept_runtime
  summary: Accepts runtime-layout tensor and dataframe parameters.
  ```
  consume_tensor(values)
  consume_rows(rows)
  return none;

fn dataframe_demo() -> i32:
  ```
  title: dataframe_demo
  summary: Exercises dataframe constructors and column access forms.
  ```
  var rows: ScoreRows = dataframe({
    id: [1, 2, 3],
    score: [0.5, .75, 1.],
    active: [true, false, true],
  })
  var score_column: ScoreSeries = rows.score
  var id_column: series[i32] = rows["id"]
  var row_count: i32 = cast(rows.nrows(), i32)
  var col_count: i32 = cast(rows.ncols(), i32)
  print(type(score_column))
  print(type(id_column))
  return row_count + col_count

fn collection_demo() -> i32:
  ```
  title: collection_demo
  summary: Exercises list, tensor, subscript, and loop syntax.
  ```
  var values: IdentifierList = range(0, 4)
  values.append(4)
  var first: i32 = values[0]
  var grid: Grid = [[1, 2], [3, 4]]
  var cell: i32 = grid[1, 0]
  var total: i32 = first + cell

  for item in values:
    total = total + item

  for item in [1, 2, 3]:
    total = total + item

  for item in range(2, 8, 2):
    total = total + item

  for var index: i32 = 0; index < 3; index + 1:
    total = total + index

  while total < 100:
    total = total + 10

  return total

fn scalar_demo(value: Scalar) -> i32:
  ```
  title: scalar_demo
  summary: Exercises builtins, literals, unary operators, and comparisons.
  ```
  var integer8: i8 = cast(7, i8)
  var integer16: i16 = cast(11, i16)
  var integer32: i32 = cast(integer8, i32)
  var integer64: i64 = clock_ticks()
  var float16_value: f16 = cast(2, f16)
  var float32_value: f32 = 1.25
  var float64_value: f64 = add_generic<f64>(1.5, 2.5)
  var boolean_value: boolean = !(false) and true
  var string_value: string = "line\\nwith\\ttabs and \"quotes\""
  var char_value: char = 'A'
  var created_at: datetime = datetime("2026-05-24T12:00:00")
  var stamped_at: timestamp = timestamp("2026-05-24T12:00:00")
  var today: date
  var now: time
  var counter: Counter = Factory.make_counter()
  var generic_int: i32 = add_generic<i32>(3, 4)
  var generic_float: f64 = Factory.identity<f64>(3.5)

  assert isinstance(value, i32 | f64), "value should match Scalar"
  assert arithmetic.add2(1, 2) == plus(1, 2)
  assert sum3(1, 2, 3) == 6
  assert twice(6) == 12
  assert maths.abs(0 - 9) >= 9

  if boolean_value || false:
    print(string_value)
  else:
    print(type(char_value))

  var integer64_as_i32: i32 = cast(integer64, i32)
  var float16_as_i32: i32 = cast(float16_value, i32)
  var float32_as_i32: i32 = cast(float32_value, i32)
  var float64_as_i32: i32 = cast(float64_value, i32)
  var generic_float_as_i32: i32 = cast(generic_float, i32)
  var counter_value: i32 = counter.get()
  var total: i32 = integer32
  total = total + integer64_as_i32
  total = total + float16_as_i32
  total = total + float32_as_i32
  total = total + float64_as_i32
  total = total + generic_int
  total = total + generic_float_as_i32
  total = total + counter_value
  return total

fn main() -> none:
  ```
  title: main
  summary: Calls each syntax-demo helper.
  ```
  var rows_total: i32 = dataframe_demo()
  var collection_total: i32 = collection_demo()
  var scalar_total: i32 = scalar_demo(1)
  var chosen: i32 = choose(true, rows_total, collection_total)
  print(chosen + scalar_total)
  return none
