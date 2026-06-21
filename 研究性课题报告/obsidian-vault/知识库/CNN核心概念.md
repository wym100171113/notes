---
title: CNN核心概念
date: 2026-06-21
tags:
  - 知识库
  - CNN
  - 深度学习
---

# CNN 核心概念

> [!abstract] 概念地图
> 卷积神经网络 = 卷积层（特征提取） + 池化层（降维） + 全连接层（分类）

## 1. 卷积层（Convolutional Layer）

**作用**：通过卷积核（Filter/Kernel）在输入图像上滑动，提取局部特征。

**数学定义**：
$$
(f * g)(i, j) = \sum_{m} \sum_{n} f(m, n) \cdot g(i-m, j-n)
$$

**关键参数**：
- 卷积核大小（kernel_size）：通常 3×3 或 5×5
- 步长（stride）：卷积核滑动步长，通常为 1
- 填充（padding）：`same` 保持尺寸不变，`valid` 不填充
- 输出通道数（filters）：该层卷积核的数量

**输出尺寸计算**：
$$
H_{out} = \frac{H_{in} - K + 2P}{S} + 1
$$

**PyTorch 实现**：
```python
nn.Conv2d(in_channels=3, out_channels=32, kernel_size=3, padding=1)
```

## 2. 激活函数（Activation）

**ReLU**：$f(x) = \max(0, x)$
- 最常用，计算简单，缓解梯度消失
- 负值直接置零，带来稀疏性

## 3. 池化层（Pooling Layer）

**MaxPooling**：取窗口内最大值

**作用**：
- 降维：减少参数数量和计算量
- 提取最显著特征
- 提供一定平移不变性

**PyTorch 实现**：
```python
nn.MaxPool2d(kernel_size=2, stride=2)
```

## 4. 批量归一化（Batch Normalization）

**作用**：
- 对每层输入做归一化，使其均值为 0，方差为 1
- 加速训练收敛
- 允许使用更大的学习率
- 有一定正则化效果

**PyTorch 实现**：
```python
nn.BatchNorm2d(num_features=32)
```

## 5. Dropout

**作用**：训练时随机丢弃一定比例的神经元，防止过拟合。

**原理**：每次训练迭代，每个神经元以概率 $p$ 被"丢弃"（输出置零），迫使网络学习冗余表示。

**常用值**：
- 卷积层后：p=0.25
- 全连接层后：p=0.5

**PyTorch 实现**：
```python
nn.Dropout(p=0.25)
```

## 6. 全连接层（Fully Connected Layer）

**作用**：将卷积提取的特征映射到分类空间。

**最后输出层**：
- 二分类：Dense(1, sigmoid)
- 多分类：Dense(N_classes, softmax)

## 典型 CNN 架构演进

| 网络 | 年份 | 关键创新 | 层数 |
|------|------|---------|------|
| LeNet | 1998 | CNN 开山之作 | 5 |
| AlexNet | 2012 | ReLU + Dropout + GPU | 8 |
| VGGNet | 2014 | 小卷积核堆叠（3×3） | 16/19 |
| ResNet | 2015 | 残差连接（Skip Connection） | 50/101/152 |

## 链接

- [[知识库/数学基础]] — 卷积、梯度下降的数学推导
- [[知识库/PyTorch学习路径]] — PyTorch 中的具体实现
- [[资源/论文清单]] — 各架构原始论文链接