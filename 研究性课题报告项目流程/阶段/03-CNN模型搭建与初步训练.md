---
title: 03-CNN模型搭建与初步训练
date: 2026-06-21
tags:
  - 阶段
  - 第三阶段
  - 模型训练
period: 2026.11.01 ~ 2027.01.31
status: 未开始
---

# 第三阶段：CNN模型搭建与初步训练

> [!info] 阶段概览
> **时间**：2026.11.01 ~ 2027.01.31（3 个月）
> **方法**：编程实验、模型训练、参数调优
> **产出**：基线 CNN 模型 + 训练日志 + 数学分析

## 任务清单

### 任务 1：搭建基线 CNN 模型

模型结构参考（3 个卷积模块 + 全连接）：

```
输入层 (128×128×3)
├── Conv2D(32, 3×3) → BatchNorm → ReLU
├── Conv2D(32, 3×3) → BatchNorm → ReLU
├── MaxPooling2D(2×2) → Dropout(0.25)
├── Conv2D(64, 3×3) → BatchNorm → ReLU
├── Conv2D(64, 3×3) → BatchNorm → ReLU
├── MaxPooling2D(2×2) → Dropout(0.25)
├── Conv2D(128, 3×3) → BatchNorm → ReLU
├── Conv2D(128, 3×3) → BatchNorm → ReLU
├── MaxPooling2D(2×2) → Dropout(0.25)
├── Flatten
├── Dense(256) → BatchNorm → ReLU → Dropout(0.5)
└── Dense(4, softmax)
```

- [ ] 使用 PyTorch 实现上述结构
- [ ] 验证输入输出维度正确
- [ ] 使用 Adam 优化器 + CrossEntropyLoss
- [ ] 参考：[[CNN核心概念]]

### 任务 2：在 TrashNet 上初步训练

- [ ] 编写训练循环（train/valid 交替）
- [ ] 添加 EarlyStopping 回调（patience=5）
- [ ] 添加 ReduceLROnPlateau 回调（factor=0.2, patience=3）
- [ ] 处理类别不均衡（class_weight）
- [ ] 设置 epochs=40 开始训练
- [ ] 记录训练日志（loss, accuracy 每 epoch）

### 任务 3：数学分析

- [ ] 推导卷积核的运算过程：输入特征图 → 卷积核滑动 → 输出特征图
- [ ] 计算各层参数数量与输出维度
- [ ] 分析损失函数变化曲线：过拟合 or 欠拟合？
- [ ] 对比不同 batch_size 对训练的影响
- [ ] 参考：[[数学基础]]

### 任务 4：初步评估

- [ ] 在训练集上评估准确率
- [ ] 在验证集上评估准确率
- [ ] 在测试集上评估准确率
- [ ] 绘制准确率/损失曲线
- [ ] 目标：TrashNet 测试集准确率 ≥ 85%

> [!danger] 可能遇到的问题
> - **过拟合**：训练集准确率高，验证集低 → 增加 Dropout，数据增强，减少模型复杂度
> - **欠拟合**：训练集准确率也低 → 增加模型深度，增加训练轮数
> - **类别不均衡**：某些类准确率极低 → 使用 class_weight 或过采样

## 阶段产出

- [ ] 基线 CNN 模型代码（PyTorch）
- [ ] 训练日志（每个 epoch 的 loss/accuracy）
- [ ] 准确率/损失曲线图
- [ ] 数学推导笔记

## 链接

- 上一阶段：[[02-数据采集与预处理]]
- 返回 [[项目总览]]
- 下一阶段：[[04-模型优化与对比分析]]