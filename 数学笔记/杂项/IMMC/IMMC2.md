---
~
---
## 1. 变量定义

- $M_i$：第 i 类产品年度质量 (kg)
- $r_i$：若无干预时的废弃率
- $\omega_i$：初创企业成功挽救比例（通常\omega_i=r_i)
- $\alpha_i$：被消费者实际消费的比例（通常 = 1）
- $EF_i^{up}$：上游生产排放因子 (kgCO₂e/kg)
- $EF_{i,k}^{eol}$：终端处置方式 k 的排放因子
- $\pi_{i,k}$：产品 i在处置方式k的比例
- $EF_i^{stor}$：仓储排放因子 (kgCO₂e/kg·month)
- $t_i$：产品 i 的平均仓储时间(月)
- $n$：年度运输次数
- $d$：单次运输距离(km)
- $EF^{veh}$：车辆排放因子 (kgCO_2e/km)
---

## 2. 避免排放（Avoided Emissions）

### 2.1 避免上游生产排放

$$
E_{\text{avoided,up}}
=
\sum_i
M_i \cdot r_i \cdot \alpha_i \cdot EF_i^{up}
$$

### 2.2 避免终端处置排放

$$
E_{\text{avoided,eol}}
=
\sum_i
M_i \cdot r_i \cdot
\left(
\sum_k \pi_{i,k} \cdot EF_{i,k}^{eol}
\right)
$$

### 2.3 总避免排放

$$
E_{\text{avoided}}
=
E_{\text{avoided,up}}
+
E_{\text{avoided,eol}}
$$

---

## 3. 运营额外排放（Additional Emissions）

### 3.1 运输排放

$$
E_{\text{transport}}
=
n \cdot d \cdot EF^{veh}
$$

### 3.2 仓储排放

$$
E_{\text{storage}}
=
\sum_i
M_i \cdot t_i \cdot EF_i^{stor}
$$

### 3.3 消费者取货排放（可选）

$$
E_{\text{pickup}}
=
N_{\text{orders}} \cdot d_{\text{pickup}} \cdot EF^{transit}
$$

### 3.4 总额外排放

$$
E_{\text{extra}}
=
E_{\text{transport}}
+
E_{\text{storage}}
+
E_{\text{pickup}}
$$

---

## 4. 年度净减排量（核心指标）

$$
\boxed{
E_{\text{net}}
=
E_{\text{avoided}}
-
E_{\text{extra}}
}
$$

---

## 5. 简化模型

若使用统一避免排放因子 $k_i$：

### 避免排放

$$
E_{\text{avoided}}
=
\sum_i
M_i \cdot r_i \cdot k_i
$$

### 净减排

$$
E_{\text{net}}
=
\left(
\sum_i M_i r_i k_i
\right)
-
\left(
n d EF^{veh}
+
\sum_i M_i t_i EF_i^{stor}
\right)
$$
