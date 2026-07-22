---
title: 同余方程进阶与Hensel引理
date: 2026-07-19
tags:
  - 数学
  - 竞赛
  - 数论
  - 同余方程
  - Hensel引理
  - Chevalley-Warning
author:
  - wym
aliases:
  - Hensel's Lemma
  - 高次同余方程
  - p-adic 提升
---

# 同余方程进阶与Hensel引理（Advanced Congruences & Hensel's Lemma）

> [!abstract] 核心定位
> 一次同余方程和二次同余方程是数论竞赛的基础工具，但当面临**模 $p^k$** 或**高次同余方程**时，需要更深刻的方法。Hensel 引理是「从 $p$ 到 $p^k$」的桥梁，相当于数论版的 Newton 迭代；Chevalley-Warning 定理则给出模 $p$ 多元方程的非平凡解存在性。本笔记系统讲解高次同余、Hensel 提升、Chevalley-Warning 与 Hasse-Minkowski 定理，与 [[整除与同余基础]]、[[二次剩余与阶]] 形成完整的同余方程理论体系。

---

## 一、模 $p^k$ 下的乘法群结构

> [!important] 模 $p^k$ 缩剩余系的结构定理
> 设 $p$ 为奇素数，$k \ge 1$。则模 $p^k$ 的缩剩余系（即 $(\mathbb{Z}/p^k\mathbb{Z})^*$）是**循环群**，阶为 $\varphi(p^k) = p^{k-1}(p-1)$。
> 对于 $p = 2$：
> - $k = 1, 2$ 时，$(\mathbb{Z}/2^k\mathbb{Z})^*$ 是循环群
> - $k \ge 3$ 时，$(\mathbb{Z}/2^k\mathbb{Z})^* \cong \mathbb{Z}/2 \times \mathbb{Z}/2^{k-2}$（非循环）

**推论**：模 $p^k$（$p$ 奇素数）存在原根，且原根数为 $\varphi(\varphi(p^k))$。模 $2^k$（$k \ge 3$）无原根。

> [!example] 模 $9$ 的原根
> $\varphi(9) = 6$。检验 $2$：$2^1 = 2, 2^2 = 4, 2^3 = 8 \equiv -1, 2^6 \equiv 1$，阶为 $6$ ✓。故 $2$ 是模 $9$ 的原根。原根总数 $\varphi(6) = 2$ 个：$2$ 与 $2^5 = 32 \equiv 5$，即 $\{2, 5\}$。

---

## 二、Hensel 引理

### 2.1 Hensel 引理（标准形式）

> [!important] Hensel 引理
> 设 $f(x) \in \mathbb{Z}[x]$，$p$ 为素数，$k \ge 1$。若 $a$ 满足：
> $$f(a) \equiv 0 \pmod{p^k}, \quad f'(a) \not\equiv 0 \pmod p$$
> 则对任意 $n \ge k$，存在**唯一**的 $b \pmod{p^n}$ 使：
> $$f(b) \equiv 0 \pmod{p^n}, \quad b \equiv a \pmod{p^k}$$

**证明**（用 Newton 迭代思想）：从 $a_k = a$ 出发，递归构造 $a_{n+1} = a_n + t_n p^n$（$t_n \in \{0, 1, \dots, p-1\}$）。Taylor 展开：
$$f(a_{n+1}) = f(a_n) + t_n p^n f'(a_n) + O(p^{2n})$$
由 $f(a_n) \equiv 0 \pmod{p^n}$，设 $f(a_n) = c p^n$，则 $f(a_{n+1}) \equiv p^n (c + t_n f'(a_n)) \pmod{p^{n+1}}$。需要 $c + t_n f'(a_n) \equiv 0 \pmod p$。由于 $f'(a_n) \equiv f'(a) \not\equiv 0 \pmod p$，可逆，故 $t_n \equiv -c / f'(a_n) \pmod p$ 唯一确定。

### 2.2 Hensel 引理（非简单根情形）

> [!important] Hensel 引理（推广）
> 若 $f(a) \equiv 0 \pmod{p^k}$ 但 $f'(a) \equiv 0 \pmod p$，则提升可能不唯一或不存在，需具体分析。

**判别**：设 $v_p(f(a)) = s$，$v_p(f'(a)) = t$（$v_p$ 为 $p$-adic 赋值）：
- 若 $s < 2t$，则 $f(a)$ 可被提升到任意 $p^n$（$n > s$）
- 若 $s > 2t$，则 $a$ 不可提升
- 若 $s = 2t$，需具体检验

> [!example] Hensel 提升应用
> 解 $x^2 \equiv 2 \pmod{7^3}$。
>
> **解**：先找模 $7$ 的解：$3^2 = 9 \equiv 2 \pmod 7$，$4^2 \equiv 2 \pmod 7$（即 $a = 3$ 或 $a = 4$）。
> - 对 $a = 3$：$f(x) = x^2 - 2$，$f'(x) = 2x$，$f'(3) = 6 \not\equiv 0 \pmod 7$ ✓。可提升。
>   - $n = 2$：$f(3) = 7$，$c = 7/7 = 1$，$t_1 \equiv -1/6 \equiv -1 \cdot 6^{-1} \pmod 7$。$6 \cdot 6 = 36 \equiv 1 \pmod 7$，故 $6^{-1} \equiv 6$，$t_1 \equiv -6 \equiv 1 \pmod 7$。$a_2 = 3 + 1 \cdot 7 = 10$。验：$10^2 = 100 = 2 + 98 = 2 + 2 \cdot 49$，故 $10^2 \equiv 2 \pmod{49}$ ✓。
>   - $n = 3$：$f(10) = 98$，$c = 98/49 = 2$，$t_2 \equiv -2/f'(10) = -2/20 = -2/20 \equiv -2 \cdot 20^{-1} \pmod 7$。$20 \equiv 6 \pmod 7$，$20^{-1} \equiv 6$，$t_2 \equiv -2 \cdot 6 = -12 \equiv 2 \pmod 7$。$a_3 = 10 + 2 \cdot 49 = 108$。验：$108^2 = 11664$，$11664 - 2 = 11662 = 343 \cdot 34 = 11662$ ✓（$343 \cdot 34 = 11662$）。故 $108^2 \equiv 2 \pmod{343}$ ✓。
> - 另一解 $a = 4$ 类似提升，或由 $-108 \equiv 235 \pmod{343}$ 给出。

---

## 三、$x^2 \equiv a \pmod{p^k}$ 的可解性

> [!important] 二次剩余模 $p^k$ 的判定（$p$ 奇）
> 设 $p$ 为奇素数，$\gcd(a, p) = 1$，$k \ge 1$。则 $x^2 \equiv a \pmod{p^k}$ 有解 $\iff$ $a$ 是模 $p$ 的二次剩余 $\iff$ $\left(\dfrac{a}{p}\right) = 1$。

**关键**：模 $p$ 的二次剩余自动可提升到模 $p^k$（因为 $f'(x) = 2x \not\equiv 0 \pmod p$）。

> [!important] $p = 2$ 情形
> - $x^2 \equiv a \pmod 2$：总有解（$a = 0$ 或 $1$）
> - $x^2 \equiv a \pmod 4$：有解 $\iff$ $a \equiv 0, 1 \pmod 4$
> - $x^2 \equiv a \pmod{2^k}$（$k \ge 3$）：有解 $\iff$ $a \equiv 1 \pmod 8$（且 $a$ 为奇）

> [!example] $x^2 \equiv 17 \pmod{128}$
> $17 \equiv 1 \pmod 8$，可解。从 $x = 1$ 出发用 Hensel 提升：
> - $x^2 \equiv 17 \pmod{16}$：$1^2 = 1 \not\equiv 1 \pmod{16}$，但 $17 \equiv 1 \pmod{16}$，所以 $x = 1, 7, 9, 15$ 模 $16$ 都是解（验证 $1^2 = 1$，$7^2 = 49 = 48 + 1 \equiv 1$，$9^2 = 81 = 80 + 1 \equiv 1$，$15^2 = 225 = 14 \cdot 16 + 1 \equiv 1$）。
> - 进一步提升到 $\bmod 32, 64, 128$。

---

## 四、高次同余方程

### 4.1 多项式模 $p$ 的根数

> [!important] Lagrange 定理
> 设 $f(x) \in \mathbb{F}_p[x]$ 为 $n$ 次多项式（$n \ge 1$），且首项系数不为零。则 $f(x) \equiv 0 \pmod p$ 在 $\mathbb{F}_p$ 中至多有 $n$ 个根（计重数）。

**证明**：对 $n$ 归纳。$n = 1$ 显然。若 $f(a) = 0$，则 $f(x) = (x - a) g(x)$，$\deg g = n - 1$。由归纳 $g$ 至多有 $n - 1$ 个根，故 $f$ 至多 $n$ 个根。

> [!important] 推论
> 若 $f$ 在 $\mathbb{F}_p$ 中有超过 $n$ 个根，则 $f \equiv 0$（即所有系数被 $p$ 整除）。

### 4.2 二次与三次同余的求解

**$x^2 \equiv a \pmod p$**：用勒让德符号判定可解性，用 Tonelli-Shanks 算法求根。

**$x^3 \equiv a \pmod p$**（$p \ne 3$）：
- 若 $p \equiv 2 \pmod 3$：总有唯一解 $x \equiv a^{(2p-1)/3} \pmod p$
- 若 $p \equiv 1 \pmod 3$：$a$ 是三次剩余 $\iff$ $a^{(p-1)/3} \equiv 1 \pmod p$；若有解则恰有三个

> [!example] 解 $x^3 \equiv 2 \pmod 7$
> $p = 7 \equiv 1 \pmod 3$。检验 $2^{(7-1)/3} = 2^2 = 4 \not\equiv 1 \pmod 7$，故 $2$ 不是模 $7$ 的三次剩余，方程无解。验证：$0^3 = 0, 1^3 = 1, 2^3 = 8 \equiv 1, 3^3 = 27 \equiv 6, 4^3 = 64 \equiv 1, 5^3 \equiv 6, 6^3 \equiv 6$，确实无 $2$。

### 4.3 一般 $k$ 次剩余

> [!important] $k$ 次剩余判定
> 设 $p$ 素数，$k \mid p - 1$，$g$ 为模 $p$ 原根。$x^k \equiv a \pmod p$ 有解 $\iff$ $a^{(p-1)/k} \equiv 1 \pmod p$ $\iff$ $k \mid \operatorname{ind}_g(a)$。

若有解，恰有 $\gcd(k, p-1)$ 个解。

---

## 五、Chevalley-Warning 定理

> [!important] Chevalley-Warning 定理
> 设 $p$ 为素数，$f_1, \dots, f_m \in \mathbb{F}_p[x_1, \dots, x_n]$ 满足 $\sum_{i=1}^{m} \deg f_i < n$。则方程组 $f_1 = f_2 = \cdots = f_m = 0$ 在 $\mathbb{F}_p^n$ 中的解的个数 $N$ 满足：
> $$p \mid N$$

**推论**：若该方程组有平凡解（如原点），则必有**非平凡解**。

> [!tip] 证明思路
> 利用恒等式 $\sum_{x \in \mathbb{F}_p} x^k = \begin{cases} -1 & p - 1 \mid k, k > 0 \\ 0 & \text{否则}\end{cases}$。
> 解的个数 $N = \sum_{x \in \mathbb{F}_p^n} \prod_{i=1}^{m} (1 - f_i(x)^{p-1})$。展开后每项 $\sum_x x_1^{a_1} \cdots x_n^{a_n}$，由于 $\sum a_i \le (p-1)\sum \deg f_i < (p-1) n$，必有某个 $a_i < p - 1$，故该和为 $0$。最终 $N \equiv 0 \pmod p$。

> [!example] Chevalley 应用：模 $p$ 二次型有非平凡零点
> 设 $f(x_1, \dots, x_n) = a_1 x_1^2 + \cdots + a_n x_n^2 \in \mathbb{F}_p[x]$（$p$ 奇素数）。若 $n \ge 3$（即 $n > \deg f = 2$），由 Chevalley-Warning，$f$ 在 $\mathbb{F}_p^n$ 中除原点外必有非零解。即 $f$ 是**迷向**的。

> [!example] 应用：有限域上二次型
> 设 $p$ 奇素数，$f = a_1 x_1^2 + a_2 x_2^2 + a_3 x_3^2 \in \mathbb{F}_p[x]$。由 Chevalley，存在非零 $(x_1, x_2, x_3) \in \mathbb{F}_p^3$ 使 $f = 0$。这给出"任意三元二次型在 $\mathbb{F}_p$ 上迷向"的简洁证明。

---

## 六、Hasse-Minkowski 定理

> [!important] Hasse-Minkowski 定理
> 有理数域 $\mathbb{Q}$ 上的非退化二次型 $Q(x_1, \dots, x_n)$ 有**非平凡有理零点** $\iff$ $Q$ 在 $\mathbb{R}$ 与所有 $\mathbb{Q}_p$（$p$-adic 数域）上都有非平凡零点。

**意义**：这是**局部-全局原则**的经典例子——通过所有"局部"（实数与各 $p$-adic）信息决定"全局"（有理数）信息。

> [!example] 应用
> 判断 $5x^2 + 7y^2 - 13z^2 = 0$ 是否有非零有理解。
> - 实数：有（如 $z = 1$，$5x^2 + 7y^2 = 13$ 在 $\mathbb{R}$ 有解）
> - 模各素数 $p$：需检验 $p$-adic 零点，可用 Hensel 引理从模 $p$ 解提升

---

## 七、Wilson 商与Wieferich素数

> [!important] Wilson 商
> $W_p = \dfrac{(p-1)! + 1}{p}$（$p$ 素数）。Wilson 商为整数（由 Wilson 定理）。
> - $W_p \equiv 0 \pmod p$ 的素数 $p$ 称为 **Wilson 素数**
> - 已知 Wilson 素数：$5, 13, 563$，下一个若存在必大于 $2 \times 10^{13}$

> [!important] Wieferich 素数
> 满足 $2^{p-1} \equiv 1 \pmod{p^2}$ 的素数 $p$。
> - 已知：$1093, 3511$（截至 2024 年仅此两个小于 $6.7 \times 10^{15}$）
> - 与 Fermat 大定理证明相关（$p$ 为 Wieferich 素数是 $x^p + y^p = z^p$ 第一类解存在性的必要条件）

> [!example] 验证 $5$ 是 Wilson 素数
> $4! + 1 = 25 = 5 \times 5$，$W_5 = 5$，$W_5 \equiv 0 \pmod 5$ ✓。

---

## 八、$p$-adic 数简介

> [!important] $p$-adic 赋值
> 对 $n \in \mathbb{Z}\setminus\{0\}$，$v_p(n)$ 为 $p$ 在 $n$ 中的最高幂次。扩展至 $\mathbb{Q}$：$v_p(a/b) = v_p(a) - v_p(b)$。
>
> $p$-adic 绝对值：$|n|_p = p^{-v_p(n)}$，$|0|_p = 0$。

> [!important] $\mathbb{Q}_p$ 的构造
> $\mathbb{Q}$ 在 $|\cdot|_p$ 下完备化得到 $\mathbb{Q}_p$（$p$-adic 数域）。$\mathbb{Q}_p$ 中每个元素可唯一表为 $\sum_{n=N}^{\infty} a_n p^n$（$a_n \in \{0, 1, \dots, p-1\}$，$N \in \mathbb{Z}$）。

> [!important] Hensel 引理的 $p$-adic 形式
> 设 $f \in \mathbb{Z}_p[x]$，$a \in \mathbb{Z}_p$ 满足 $|f(a)|_p < |f'(a)|_p^2$。则存在 $\mathbb{Z}_p$ 中唯一 $\alpha$ 使 $f(\alpha) = 0$ 且 $|\alpha - a|_p \le |f(a)/f'(a)|_p$。

> [!tip] $p$-adic 数的应用
> $p$-adic 数是现代数论的核心工具：
> - 数论函数在 $p$-adic 域上的解析性（$p$-adic 解析数论）
> - Wiles 证明 Fermat 大定理用 $p$-adic Galois 表示
> - Diophantine 方程的局部-全局方法（Hasse 原则）

---

## 九、典型例题

> [!example] 例 1：Hensel 提升的运用
> 求 $x^3 \equiv 3 \pmod{5^3}$ 的所有解。
>
> **解**：先找模 $5$ 的解。$0^3 = 0, 1^3 = 1, 2^3 = 8 \equiv 3 \pmod 5$ ✓，$3^3 = 27 \equiv 2$，$4^3 = 64 \equiv 4$。故唯一解 $a = 2$（$f'(x) = 3x^2$，$f'(2) = 12 \equiv 2 \not\equiv 0 \pmod 5$ ✓）。
> - 提升至 $\bmod 25$：$f(2) = 8 - 3 = 5$，$c = 5/5 = 1$。$t_1 \equiv -c/f'(2) = -1/12 \equiv -1/2 \equiv -1 \cdot 3 \equiv 2 \pmod 5$（$2^{-1} \equiv 3$ 因 $2 \cdot 3 = 6 \equiv 1$）。$a_1 = 2 + 2 \cdot 5 = 12$。验：$12^3 = 1728 = 25 \cdot 69 + 3$，故 $12^3 \equiv 3 \pmod{25}$ ✓。
> - 提升至 $\bmod 125$：$f(12) = 1725$，$c = 1725/25 = 69$。$f'(12) = 3 \cdot 144 = 432 \equiv 432 - 4 \cdot 100 = 32 \equiv 2 \pmod 5$。$t_2 \equiv -69/2 \equiv -69 \cdot 3 \equiv -207 \equiv -207 + 42 \cdot 5 = 3 \pmod 5$。$a_2 = 12 + 3 \cdot 25 = 87$。验：$87^3 = 658503 = 125 \cdot 5268 + 3$，故 $87^3 \equiv 3 \pmod{125}$ ✓。

> [!example] 例 2：Chevalley-Warning 应用
> 证明对任意奇素数 $p$，存在不全为零的 $x, y, z \in \mathbb{F}_p$ 使 $x^2 + y^2 + z^2 = 0$。
>
> **解**：$f = x^2 + y^2 + z^2$ 是 2 次齐次式，$\deg f = 2 < 3 = n$。由 Chevalley-Warning，$f = 0$ 在 $\mathbb{F}_p^3$ 中解数 $N \equiv 0 \pmod p$。原点 $(0,0,0)$ 是一解，故 $N \ge 1$；又 $p \mid N$，故 $N \ge p \ge 3 > 1$，必有非零解。

> [!example] 例 3：模 $8$ 二次剩余
> 求 $x^2 \equiv 41 \pmod{64}$ 的所有解。
>
> **解**：$41 \equiv 1 \pmod 8$，可解。从模 $8$ 开始：$x^2 \equiv 1 \pmod 8$ 给 $x \equiv 1, 3, 5, 7 \pmod 8$。
> - 提升至模 $16$：$41 \equiv 9 \pmod{16}$，$x^2 \equiv 9 \pmod{16}$ 给 $x \equiv 3, 5, 11, 13 \pmod{16}$（验：$3^2 = 9$，$5^2 = 25 \equiv 9$，$11^2 = 121 \equiv 9$，$13^2 = 169 \equiv 9$ ✓）。
> - 提升至模 $32$：$41 \equiv 9 \pmod{32}$，需 $x^2 \equiv 9 \pmod{32}$。$3^2 = 9$ ✓，$11^2 = 121 = 4 \cdot 32 - 7 = 128 - 7 = 121$，$121 \bmod 32 = 121 - 3 \cdot 32 = 121 - 96 = 25 \ne 9$。故 $11$ 不行。试 $19 = 16 + 3$：$19^2 = 361 = 11 \cdot 32 + 9 = 361$ ✓。$21 = 16 + 5$：$21^2 = 441 = 13 \cdot 32 + 25 \ne 9$。$29 = 16 + 13$：$29^2 = 841 = 26 \cdot 32 + 9$ ✓。
> - 提升至模 $64$：类似检验，从 $3, 19, 29$ 出发，得到 $9, 19, 29, 35, 45, 55$ 等。

> [!example] 例 4：多项式模 $p$ 根数
> 设 $f(x) = x^3 - x + 1$。求其在 $\mathbb{F}_7$ 中的根。
>
> **解**：枚举 $x = 0, 1, \dots, 6$：
> - $f(0) = 1$
> - $f(1) = 1$
> - $f(2) = 8 - 2 + 1 = 7 \equiv 0$ ✓
> - $f(3) = 27 - 3 + 1 = 25 \equiv 4$
> - $f(4) = 64 - 4 + 1 = 61 \equiv 5$
> - $f(5) = 125 - 5 + 1 = 121 \equiv 2$
> - $f(6) = 216 - 6 + 1 = 211 \equiv 211 - 30 \cdot 7 = 211 - 210 = 1$
>
> 只有 $x = 2$ 是根。Lagrange 定理保证 $\le 3$ 个根，这里只有 1 个。

> [!example] 例 5：$p$-adic 赋值应用
> 求 $v_2\left(\binom{2^n}{2^{n-1}}\right)$ 的值。
>
> **解**（Kummer 定理）：$v_p\binom{m+k}{m}$ 等于 $m$ 与 $k$ 在 $p$ 进制加法中的进位次数。$m = k = 2^{n-1}$，$p = 2$。$2^{n-1}$ 在二进制下是 $1$ 后面 $n-1$ 个零。$2^{n-1} + 2^{n-1} = 2^n$，加法过程：从最低位开始，$0 + 0 = 0$，无进位，直到第 $n-1$ 位 $1 + 1 = 10$，进位 $1$ 到第 $n$ 位，剩余 $0$。共 $1$ 次进位。故 $v_2\binom{2^n}{2^{n-1}} = 1$。

> [!example] 例 6：模 $p$ 多项式根的精细分析
> 求 $f(x) = x^5 + x + 1$ 在 $\mathbb{F}_2$ 中的根。
>
> **解**：$f(0) = 1$，$f(1) = 1 + 1 + 1 = 1 \pmod 2$。无根。但 $f(x) = (x^2 + x + 1)(x^3 + x^2 + 1)$ 在 $\mathbb{F}_2[x]$ 中可约（验证：$(x^2 + x + 1)(x^3 + x^2 + 1) = x^5 + x^4 + x^2 + x^4 + x^3 + x + x^3 + x^2 + 1 = x^5 + (x^4 + x^4) + (x^3 + x^3) + (x^2 + x^2) + x + 1 = x^5 + x + 1$ ✓）。这表明 $f$ 在 $\mathbb{F}_2$ 上无根但可约，是不可约性判定的反例。

---

## 十、$p$-adic 数的运算与方程求解

> [!important] $\mathbb{Z}_p$ 中的运算
> $\mathbb{Z}_p$（$p$-adic 整数环）是 $\mathbb{Z}$ 在 $p$-adic 拓扑下的完备化。其元素可表为 $\sum_{n=0}^{\infty} a_n p^n$（$a_n \in \{0, 1, \dots, p-1\}$）。

**$\mathbb{Z}_p$ 中的方程求解**：
- $x^2 = a$ 在 $\mathbb{Z}_p$ 中有解 $\iff$ $a \not\equiv 0 \pmod p$ 且 $a$ 是模 $p$ 二次剩余；或 $a = p^{2k} u$（$u$ 单位，模 $p$ 剩余）
- $x^n = a$ 类似判定（基于 Hensel 与 $n$ 次剩余理论）

> [!example] 在 $\mathbb{Z}_2$ 中求 $x^2 = 17$ 的解
> $17 \equiv 1 \pmod 8$，在 $\mathbb{Z}_2$ 中有 4 个解：$\pm 1, \pm (1 + 4 + \cdots)$（具体展开为 $2$-adic 级数）。

---

## 十一、知识链接

- [[整除与同余基础]] — 一次同余方程与裴蜀定理是本笔记的前置
- [[二次剩余与阶]] — 二次剩余模 $p^k$ 的可解性依赖此处的 Hensel 引理
- [[数论函数与欧拉定理]] — 模 $p^k$ 的乘法群结构建立在欧拉函数上
- [[不定方程与丢番图方程]] — Hasse-Minkowski 是连接局部（$p$-adic）与全局（有理数）的桥梁
- [[组合数论：卢卡斯与库默尔]] — Chevalley-Warning 的多元多项式计数在组合论中有应用
- [[多项式与方程]] — 多元多项式模 $p$ 的根计数与 Chevalley-Warning 定理
- [[对称多项式与牛顿恒等式深化]] — Newton 恒等式在模 $p$ 与 $p$-adic 提升中的应用
- [[矩阵与线性代数初步]] — 模 $p$ 矩阵的相似标准型与 $p$-adic 范数
