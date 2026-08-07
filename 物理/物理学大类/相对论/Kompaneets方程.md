---
title: Kompaneets方程
date: 2026-08-07
author: wym
tags:
  - 物理/物理学大类
  - 物理/相对论
  - 物理/辐射转移
aliases:
  - Kompaneets 方程
  - 康普顿化方程
---

# Kompaneets方程

> [!abstract] 概览
> Kompaneets 方程是描述光子被热电子非弹性散射（康普顿化）过程中光子分布演化的福克-普朗克型方程，是 Sunyaev-Zeldovich 效应与 X 射线天体物理的核心理论工具。

## 核心内容

Kompaneets 方程由 A. S. Kompaneets 于 1957 年导出，描述低能光子（能量 $\varepsilon\ll m_ec^2$）在非相对论热电子气中被多次康普顿散射后的统计演化。它将散射视为光子在能量空间的扩散-漂移过程，得到光子分布函数 $n(\varepsilon,t)$ 的演化方程：

$$
\frac{\partial n}{\partial y}=\frac{1}{x^2}\frac{\partial}{\partial x}\left[x^4\left(\frac{\partial n}{\partial x}+n+n^2\right)\right]
$$

其中 $x=\varepsilon/(k_BT_e)$ 为无量纲光子能量，$n$ 为光子占有数。**康普顿化参数** $y$ 定义为

$$
y=\int \frac{k_BT_e}{m_ec^2}\,n_e\sigma_T\,c\,dt
$$

是衡量散射总效应（能量交换程度）的关键无量纲参量，等于电子-光子每次散射的平均能量相对转移率乘以散射总次数。

方程中的三项分别对应：扩散项 $\partial n/\partial x$ 描述光子在能量空间的随机游走；$n$ 项描述由电子温度驱动的漂移（朝向 $x=4$ 的平衡点）；$n^2$ 项来自受激发散，在经典低占有数极限可略去。平衡态为玻色-爱因斯坦分布 $n=1/(e^{x+\mu}-1)$，对应光子与电子达到共同温度。

Kompaneets 方程是 Sunyaev-Zeldovich (SZ) 效应的理论基础。CMB 光子穿过星系团内高温电子气（$T_e\sim 10^8\,\mathrm{K}$）时发生康普顿化，平均能量升高，导致 CMB 谱在 Rayleigh-Jeans 端温度降低、Wien 端温度升高。这一谱畸变正是 SZ 效应的物理本质。

## 与其他知识关联

- [[SZ效应]]：Kompaneets 方程的直接应用
- [[逆康普顿散射]]：单次散射的微观图像
- [[汤姆孙散射]]：散射截面的低能极限
- 返回 [[相对论]]

## 参考笔记

- [[SZ效应]]
- [[逆康普顿散射]]
- [[汤姆孙散射]]
- [[相对论]]

---
*返回 [[相对论]]*
