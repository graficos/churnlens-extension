# Churn and Delta

ChurnLens reports two different numbers about code change. They answer two
different questions. Do not mix them.

## Delta: the net change

Delta is what is left after addition and deletion cancel each other out.

```
delta = lines added - lines deleted
```

- `+40` means the file grew by 40 lines.
- `-40` means the file shrank by 40 lines.
- `0` means it changed size by nothing at all.

Delta tells you the **direction** and the **net size** of the change.

## Churn: the total movement

Churn is the total amount of code that moved, in either direction.

```
churn = lines added + lines deleted
```

- `100` means 100 lines changed, no matter which way.
- Churn is never negative.

Churn tells you **how much change happened**.

## Why both, and why churn is the important one

A single number hides a critical case. Suppose a file loses 200 lines and gains
200 new lines. Its delta is `0`, but it was almost completely rewritten. Delta
says "no change". Churn says "400 lines of movement". Only churn warns you.

This is the central finding of the paper that ChurnLens is built on:

> Removing a lot of code is probably as catastrophic as adding a bunch.

A file that is rewritten is risky, even when it does not grow. Delta cannot see
that. Churn can.

The paper measured this against real defect reports. Code churn predicted defects
better than the number of change requests, better than the net delta, and better
than the number of people involved. That is why ChurnLens ranks risk by churn,
not by delta.

## How the pieces fit together

| Signal | Formula | What it means |
| --- | --- | --- |
| Added | count | New lines in the window |
| Removed | count | Deleted lines in the window |
| Modified | count | Lines present in both the before and after state |
| Delta | added - deleted | Net growth or shrink |
| Churn | added + deleted | Total movement (the risk signal) |
| Deletion ratio | deleted / added | For every line added, how many were removed |

## Reading a trend

- High churn, high delta: the codebase is growing fast. New work, some risk.
- High churn, low delta: lots of rewriting and replacement. Often the riskiest
  pattern, because work is being redone.
- Low churn, negative delta: cleanup and refactoring.

When churn rises but delta stays flat, more effort is going into rework than into
new capability. That is worth investigating.

## Reference

J. C. Munson and S. G. Elbaum, "Code Churn: A Measure for Estimating the Impact
of Code Change", IEEE International Conference on Software Maintenance, 1998.
See [`icsm.1998.738486.md`](./icsm.1998.738486.md).
