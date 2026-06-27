# 垃圾分类智能识别系统 v3 — Windows 部署与使用教程

## 一、系统简介

垃圾分类智能识别系统 v3 是一个基于深度学习的智能垃圾分类 Web 应用，集成了以下核心功能：

| 模块 | 说明 |
|------|------|
| **智能分类** | 基于 MobileNetV2 的 25 类细粒度分类 + 四分类映射（可回收物 / 有害垃圾 / 厨余垃圾 / 其他垃圾） |
| **可解释性** | Grad-CAM 热力图可视化，展示模型关注区域 |
| **污染评估** | 基于图像底层特征估算垃圾污染程度（0-1 评分），并给出回收建议 |
| **目标检测** | 混合垃圾场景中定位并分类多个物体 |
| **知识库** | 四分类体系详细说明与投放指南 |

### 支持的 25 个细分类别

```
可回收物：易拉罐、塑料瓶、纸袋、纸箱、玻璃、金属、纸张、塑料、衣物、鞋子、打包盒
有害垃圾：杀虫剂、指甲油、过期药物、电池、喷雾罐
厨余垃圾：果皮、水果、食物、蛋壳、咖啡渣
其他垃圾：一次性杯子、卫生纸、口罩、一次性餐具
```

---

## 二、环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10 / 11（64位） |
| Python | **3.11**（推荐，已验证兼容） |
| 内存 | ≥ 8GB |
| 硬盘空间 | ≥ 2GB（含模型文件） |
| GPU（可选） | 支持 CUDA 的 NVIDIA 显卡，可加速推理 |

---

## 三、部署步骤（Windows）

### 步骤 1：安装 Python 3.11

1. 前往 [Python 官网](https://www.python.org/downloads/) 下载 Python 3.11.x 的 Windows installer (64-bit)。
2. 双击运行安装程序，**务必勾选 "Add Python 3.11 to PATH"**。
3. 选择 **"Install Now"** 完成安装。
4. 验证安装：打开 **命令提示符（CMD）** 或 **PowerShell**，执行：

```cmd
python --version
```

应输出 `Python 3.11.x`。

### 步骤 2：解压项目文件

将项目文件夹解压到任意位置，例如：

```
D:\garbage-classifier\
```

确保目录结构如下：

```
D:\garbage-classifier\
├── web_app.py              # 主入口
├── ensemble_model.py       # 分类模型
├── requirements.txt        # 依赖清单
├── run.sh                  # Linux 启动脚本（Windows 无需使用）
├── models\
│   ├── garbage_classification.h5   # 预训练模型文件
│   └── classes.txt                 # 类别标签
├── contamination\          # 污染评估模块
│   ├── __init__.py
│   └── assessor.py
├── detection\              # 目标检测模块
│   ├── __init__.py
│   └── detector.py
├── explainability\         # 可解释性模块
│   ├── __init__.py
│   └── gradcam.py
├── templates\              # Web 前端页面
│   └── index.html
└── uploads\                # 上传文件存放（运行后自动创建）
```

> **注意：** 确认 `models\garbage_classification.h5` 文件存在且未损坏，这是系统运行的核心模型文件。

### 步骤 3：创建虚拟环境（推荐）

在项目根目录打开 CMD 或 PowerShell，执行：

```cmd
cd D:\garbage-classifier
python -m venv venv
```

激活虚拟环境：

```cmd
venv\Scripts\activate
```

激活后命令行前会出现 `(venv)` 标识，后续所有操作都在此环境下进行。

### 步骤 4：安装依赖

```cmd
pip install -r requirements.txt
```

主要依赖包及版本：

| 包名 | 版本要求 | 用途 |
|------|----------|------|
| tensorflow | >= 2.16 | 深度学习框架 |
| flask | >= 3.0 | Web 服务器 |
| opencv-python | >= 4.9 | 图像处理 |
| numpy | >= 1.26 | 数值计算 |
| scipy | >= 1.12 | 科学计算 |
| werkzeug | >= 3.0 | WSGI 工具库 |

**安装时间约 5-15 分钟**，取决于网络速度。TensorFlow 包较大（约 500MB）。

> **常见问题：** 如果 `pip install` 速度慢，可使用国内镜像源：
>
> ```cmd
> pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
> ```

> **TensorFlow GPU 支持（可选）：** 如需 GPU 加速，需先安装 CUDA Toolkit 12.x 和 cuDNN 8.9+，参考 [TensorFlow GPU 安装指南](https://www.tensorflow.org/install/pip#step-by-step_instructions)。

### 步骤 5：启动系统

```cmd
python web_app.py
```

启动成功后终端会显示：

```
============================================================
  垃圾分类智能识别系统 v3
  集成: 分类 + 可解释性 + 污染评估 + 目标检测
  访问地址: http://127.0.0.1:5001
============================================================
```

> **注意：** 首次启动时，模型文件（`garbage_classification.h5`）会自动加载到内存中，可能需要等待几秒钟。看到 `[OK] 模型加载成功` 表示加载完毕。

### 步骤 6：访问 Web 界面

打开浏览器（推荐 Chrome / Edge），访问：

```
http://127.0.0.1:5001
```

---

## 四、功能使用指南

### 4.1 智能识别（分类 + 可解释性 + 污染评估）

这是系统的核心功能，支持单张和批量识别。

**操作步骤：**

1. 切换到 **「智能识别」** 标签页。
2. 上传图片，支持以下方式：
   - **点击上传区域**：选择本地图片
   - **拖拽上传**：将图片直接拖入虚线框
   - **粘贴上传**：截图后按 `Ctrl + V` 粘贴
3. 支持 **多选**，可一次上传多张图片。
4. 点击 **「识别（N张）」** 按钮。
5. 等待识别完成，查看结果。

**结果说明：**

| 字段 | 说明 |
|------|------|
| 识别结果 | 模型预测的 25 类细分类别 |
| 分类标签 | 四分类结果（可回收物/有害垃圾/厨余垃圾/其他垃圾） |
| 置信度 | 模型对该预测的置信百分比 |
| 污染评分 | 0-100%，越高表示越脏/污染越严重 |
| 污染等级 | 清洁 / 轻微污染 / 中度污染 / 重度污染 / 严重污染 |
| 可回收 | 是/否（综合类别和污染程度判断） |
| 回收建议 | 基于分类和污染评估给出的投放建议 |
| Top-3 | 模型预测概率最高的 3 个类别 |
| Grad-CAM 热力图 | 展示模型关注的图像区域 |

**支持的图片格式：** JPG、PNG、GIF、BMP、WebP，单张最大 50MB。

### 4.2 目标检测

用于检测混合垃圾场景中的多个物体。

**操作步骤：**

1. 切换到 **「目标检测」** 标签页。
2. 上传一张包含多个垃圾物体的图片。
3. 点击 **「开始检测」**。
4. 查看标注后的图像和检测结果列表。

系统会在原图上绘制检测框，显示每个检测到的物体的类别和置信度。

### 4.3 知识库

切换到 **「知识库」** 标签页，查看四分类体系的详细说明：

- 各类垃圾的具体物品列表
- 投放要求和处理建议
- 识别覆盖范围

### 4.4 少样本识别

> 当前版本此模块已禁用。切换到该标签页会提示 "少样本识别模块已禁用"。

---

## 五、API 接口文档

系统提供 RESTful API，可供外部程序调用。

### 5.1 单张识别（含可解释性）

```
POST /api/predict
```

- **请求**：`multipart/form-data`，字段 `file`（图片文件）
- **响应**：JSON 对象，包含 `fine_class`、`category`、`confidence`、`contamination_score`、`contamination_level`、`recyclable`、`gradcam_image`（base64）等

### 5.2 批量识别

```
POST /api/batch_predict
```

- **请求**：`multipart/form-data`，字段 `files`（多个图片文件）
- **响应**：JSON 数组，每个元素为单张识别结果

### 5.3 目标检测

```
POST /api/detect
```

- **请求**：`multipart/form-data`，字段 `file`（图片文件）
- **响应**：JSON 对象，包含 `object_count`、`objects`（检测列表）、`annotated_image`（base64 标注图）

### 5.4 分类信息查询

```
GET /api/categories
GET /api/model_info
```

---

## 六、自定义配置

### 6.1 修改端口

编辑 `web_app.py` 最后一行：

```python
app.run(debug=False, host='0.0.0.0', port=5001)
```

将 `port=5001` 改为所需端口（如 `port=8080`）。

### 6.2 允许局域网访问

默认已设置 `host='0.0.0.0'`，同一局域网内的其他设备可通过 `http://<你的IP>:5001` 访问。

查看本机 IP：

```cmd
ipconfig
```

找到 "IPv4 地址"（如 `192.168.1.100`），其他设备访问 `http://192.168.1.100:5001` 即可。

### 6.3 修改上传文件大小限制

```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
```

### 6.4 修改上传文件保存路径

```python
UPLOAD_FOLDER = 'uploads'
```

---

## 七、项目目录结构详解

```
D:\garbage-classifier\
│
├── web_app.py                    # Flask 主入口，定义路由和 API
├── ensemble_model.py             # 分类模块：MobileNetV2 + 25类/4类映射
├── requirements.txt              # Python 依赖清单
├── run.sh                        # Linux 启动脚本（Windows 不使用）
│
├── models/
│   ├── garbage_classification.h5 # 预训练 Keras 模型文件
│   └── classes.txt               # 25 类标签名称
│
├── contamination/                # 污染评估模块
│   ├── __init__.py
│   └── assessor.py               # ContaminationPredictor + RecyclabilityAssessor
│
├── detection/                    # 目标检测模块
│   ├── __init__.py
│   └── detector.py               # GarbageDetector（SSD MobileNet / 简化检测）
│
├── explainability/               # 可解释性模块
│   ├── __init__.py
│   └── gradcam.py                # GradCAM 热力图生成
│
├── templates/
│   └── index.html                # Web 前端页面（单页应用）
│
└── uploads/                      # 运行时自动创建，存放用户上传的图片
```

---

## 八、常见问题排查

### Q1：启动报错 `No module named 'tensorflow'`

```cmd
pip install tensorflow>=2.16
```

确认使用的是虚拟环境（命令行前有 `(venv)` 标识）。

### Q2：TensorFlow 安装缓慢或失败

使用国内镜像源：

```cmd
pip install tensorflow>=2.16 -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q3：启动报错 `模型文件不存在`

确认 `models/garbage_classification.h5` 文件存在且路径正确。文件大小约几百 MB。

### Q4：浏览器访问 `127.0.0.1:5001` 无法打开

1. 确认 `python web_app.py` 正在运行且未报错。
2. 检查防火墙是否阻止了 5001 端口：
   - 打开 Windows Defender 防火墙 → 高级设置 → 入站规则 → 新建规则
   - 选择"端口" → TCP → 特定端口 `5001` → 允许连接
3. 换一个端口试试：将 `web_app.py` 中的 `port=5001` 改为 `port=8080`。

### Q5：识别结果不准

- 确保图片清晰、主体突出、背景简洁。
- 图片中垃圾物体应占较大面积。
- 支持 JPG/PNG 等常见格式。

### Q6：启动时报 `TF_USE_LEGACY_KERAS` 相关警告

这是正常现象。系统设置 `TF_USE_LEGACY_KERAS=1` 以兼容旧版 `.h5` 模型格式，不影响功能。

### Q7：批量识别时部分图片报错

系统会跳过无效文件（非图片格式或损坏文件），并在结果中标记为"无效文件"，其他正常图片不受影响。

---

## 九、关闭系统

在运行 `python web_app.py` 的终端窗口中按 `Ctrl + C` 即可停止服务。

---

## 十、一键启动脚本（可选）

如果你希望像 Linux 版的 `run.sh` 一样一键启动，可以创建一个 Windows 批处理文件：

在项目根目录新建文件 `start.bat`，写入以下内容：

```bat
@echo off
cd /d "%~dp0"

REM 检查虚拟环境
if not exist "venv\Scripts\activate.bat" (
    echo 创建虚拟环境...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
) else (
    call venv\Scripts\activate.bat
)

echo 启动垃圾分类智能识别系统...
python web_app.py
pause
```

双击 `start.bat` 即可自动创建虚拟环境（首次）、安装依赖（首次）、启动服务。
