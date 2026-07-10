## Setting Up the Problem

We need to maximize $f(x,y) = (x+1)(5y+2)$ subject to the constraint $x^2+y^2=1$.

**Using Lagrange multipliers:**


$$
\nabla f = \lambda \nabla g \implies (5y+2, 5(x+1)) = \lambda(2x, 2y)
$$


This gives:

$$
5y+2 = 2\lambda x, \qquad 5(x+1) = 2\lambda y
$$


Eliminating $\lambda$:

$$
y(5y+2) = 5x(x+1) \implies 5(y^2-x^2) + 2y - 5x = 0
$$


## Solving the System

Writing $x=\cos\theta,\ y=\sin\theta$ and combining with $x^2+y^2=1$ leads (after simplification) to:


$$
y = \frac{5}{2}(2x-1)(x+1)
$$


Substituting into $x^2+y^2=1$ and simplifying produces the cubic:


$$
100x^3 - 71x + 21 = 0
$$


Testing $x = \dfrac{3}{5}$:

$$
100\left(\tfrac{27}{125}\right) - 71\left(\tfrac{3}{5}\right) + 21 = 21.6 - 42.6 + 21 = 0 \checkmark
$$


So $x = \dfrac{3}{5}$ is a root. Factoring:

$$
100x^3-71x+21 = (5x-3)(20x^2+12x-7)
$$


The quadratic factor gives two more real roots, $x \approx 0.363$ and $x\approx -0.963$, but checking these numerically gives smaller values of $f$ (around $-3.6$ and $0.02$ respectively).

## Evaluating the Best Candidate

For $x = \dfrac{3}{5}$:

$$
y = \frac{5}{2}\left(2\cdot\tfrac35 - 1\right)\left(\tfrac35+1\right) = \frac{5}{2}\cdot\frac{1}{5}\cdot\frac{8}{5} = \frac{4}{5}
$$


**Check constraint:** $\left(\dfrac35\right)^2+\left(\dfrac45\right)^2 = \dfrac{9}{25}+\dfrac{16}{25}=1$ ✓

**Compute f:**

$$
f = \left(\frac{3}{5}+1\right)\left(5\cdot\frac{4}{5}+2\right) = \frac{8}{5}\cdot 6 = \frac{48}{5}
$$


Comparing with the other critical points (which give much smaller values), this is the maximum.

## Answer


$$
\boxed{(x+1)(5y+2)_{\max} = \frac{48}{5}}
$$


attained at $x=\dfrac35,\ y=\dfrac45$.