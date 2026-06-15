---
title: Math & Science Notes
author: q3alique
date: 2026-06-15
tags: [math, katex, physics]
---

# Math & Science Notes

MDown renders LaTeX math with **KaTeX**, both inline and as display blocks.

## Inline math

The mass–energy equivalence $E = mc^2$ sits comfortably inside a sentence, as
does the golden ratio $\varphi = \tfrac{1 + \sqrt{5}}{2} \approx 1.618$.

## Display math

The Gaussian integral:

$$
\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}
$$

The quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Maxwell's equations in differential form:

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} &
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} &
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

## A matrix

$$
A = \begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

## Physical constants

| Constant            | Symbol          | Value                                  |
| ------------------- | --------------- | -------------------------------------- |
| Speed of light      | $c$             | $2.998 \times 10^{8}\ \text{m/s}$      |
| Planck constant     | $h$             | $6.626 \times 10^{-34}\ \text{J·s}$    |
| Elementary charge   | $e$             | $1.602 \times 10^{-19}\ \text{C}$      |
| Gravitational const | $G$             | $6.674 \times 10^{-11}\ \text{N·m}^2/\text{kg}^2$ |

## A worked sum

The sum of the first $n$ natural numbers is

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}.
$$

For $n = 100$, that gives $5050$.[^gauss]

[^gauss]: A result famously rediscovered by a young Carl Friedrich Gauss.
