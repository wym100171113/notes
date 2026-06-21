---
title: PyTorch学习路径
date: 2026-06-21
tags:
  - 知识库
  - PyTorch
  - 编程
---

# PyTorch 学习路径

> [!abstract] 学习目标
> 掌握 PyTorch 核心 API，能够独立搭建 CNN 模型、编写训练循环、完成模型评估。

## 阶段一：Tensor 基础

```python
import torch
import torch.nn as nn
import numpy as np

# 创建 Tensor
x = torch.tensor([1, 2, 3])
y = torch.zeros(3, 3)
z = torch.randn(2, 3)

# 基本运算
a = x + y
b = torch.matmul(z, z.T)

# GPU 支持
if torch.cuda.is_available():
    x = x.cuda()
```

## 阶段二：自动求导

```python
# requires_grad 追踪梯度
w = torch.randn(3, 3, requires_grad=True)
loss = (w ** 2).sum()
loss.backward()  # 自动计算梯度
print(w.grad)    # 查看梯度
```

## 阶段三：DataLoader 数据加载

```python
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

# 定义变换
transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5],
                         std=[0.5, 0.5, 0.5])
])

# 自定义 Dataset
class GarbageDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        image = Image.open(self.image_paths[idx]).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, self.labels[idx]

# 创建 DataLoader
dataset = GarbageDataset(paths, labels, transform)
loader = DataLoader(dataset, batch_size=32, shuffle=True)
```

## 阶段四：模型构建

```python
class CNN(nn.Module):
    def __init__(self, num_classes=4):
        super(CNN, self).__init__()

        self.conv_block1 = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout(0.25)
        )

        self.conv_block2 = nn.Sequential(
            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout(0.25)
        )

        self.conv_block3 = nn.Sequential(
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout(0.25)
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 16 * 16, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.conv_block1(x)
        x = self.conv_block2(x)
        x = self.conv_block3(x)
        x = self.classifier(x)
        return x
```

## 阶段五：训练循环

```python
def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return running_loss / len(loader), 100. * correct / total

def validate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    return running_loss / len(loader), 100. * correct / total
```

## 阶段六：模型保存与加载

```python
# 保存
torch.save(model.state_dict(), 'model.pth')

# 加载
model = CNN(num_classes=4)
model.load_state_dict(torch.load('model.pth'))
model.eval()
```

## 学习资源

| 资源 | 链接 | 说明 |
|------|------|------|
| 动手学深度学习 | https://d2l.ai/ | 李沐，PyTorch 版，最佳入门 |
| PyTorch 官方教程 | https://pytorch.org/tutorials/ | 官方文档，最权威 |
| PyTorch 60分钟入门 | https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html | 快速上手 |

## 链接

- [[知识库/CNN核心概念]] — 用 PyTorch 实现 CNN 各组件
- [[阶段/03-CNN模型搭建与初步训练]] — 实际训练流程