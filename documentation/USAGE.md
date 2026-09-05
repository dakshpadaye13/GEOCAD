# 📖 Blender MCP v2 - Complete Usage Guide

Complete guide for using Blender MCP with Antigravity IDE and Google Gemini 3 Pro.

---

## ⚠️ Important: Model Requirement

> **This MCP only works with Gemini 3 Pro (High) model in Antigravity IDE.**
> 
> Other models (Gemini Flash, GPT, Claude, etc.) are **NOT supported** due to:
> - Complex tool calling requirements
> - 3D geometry understanding
> - Multi-step workflow execution
>
> **Make sure you select "Gemini 3 Pro (High)" in Antigravity IDE settings before using this MCP.**

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation Blender Addon](#-installation-blender-addon)
3. [Integration Antigravity IDE](#-integration-antigravity-ide)
4. [Starting the Connection](#-starting-the-connection)
5. [Basic Usage](#-basic-usage)
6. [Advanced Usage](#-advanced-usage)
7. [Tool Reference](#-tool-reference)
8. [Tips & Best Practices](#-tips--best-practices)

---

## 📦 Prerequisites

Make sure you have the following installed:

| Software | Version | Download |
|----------|---------|----------|
| Blender | 4.0+ | https://www.blender.org/download/ |
| Node.js | 18+ | https://nodejs.org/ |
| Antigravity IDE | Latest | (internal) |
| **AI Model** | **Gemini 3 Pro (High)** | Select in IDE settings |

---

## 🔧 Installation Blender Addon

### Step 1: Locate the Addon File

The addon file is located at:
```
blender-mcp-v2/mcp_connector_v2.py
```

### Step 2: Open Blender Preferences

1. Open **Blender**
2. Click **Edit** in the menu bar
3. Select **Preferences...**

### Step 3: Go to Add-ons Tab

1. In the Preferences window, click the **Add-ons** tab (left sidebar)
2. Click the **Install...** button (top right corner)

### Step 4: Install the Addon

1. Navigate to the `blender-mcp-v2` folder
2. Select the file `mcp_connector_v2.py`
3. Click **Install Add-on**

### Step 5: Enable the Addon

1. Search for the addon by typing "MCP" in the search box
2. Check the checkbox for **Interface: MCP Connector v2**
3. Click **Save Preferences** (bottom left corner)

### Step 6: Verify Installation

1. Press `N` in the 3D Viewport to open the sidebar
2. Find the **MCP** tab
3. You should see a panel with a "Start Server" button

✅ **Addon successfully installed!**

---

## 🔌 Integration Antigravity IDE

### Step 1: Build MCP Server

Open terminal/command prompt:

```bash
cd path/to/blender-mcp-v2/src/mcp-server
npm install
npm run build
```

Make sure there are no errors.

### Step 2: Find Config File

Config file location:

**Windows:**
```
C:\Users\{USERNAME}\.gemini\antigravity\mcp_config.json
```

**macOS/Linux:**
```
~/.gemini/antigravity/mcp_config.json
```

### Step 3: Edit Config File

Open the file and add the `blender-mcp` entry:

```json
{
  "mcpServers": {
    "blender-mcp": {
      "command": "node",
      "args": ["C:/Users/USERNAME/path/to/blender-mcp-v2/src/mcp-server/dist/index.js"],
      "env": {
        "BLENDER_HOST": "127.0.0.1",
        "BLENDER_PORT": "9876"
      }
    }
  }
}
```

⚠️ **Important:**
- Replace `USERNAME` and path with your actual file location
- Use forward slashes `/` instead of backslashes `\`
- Make sure the path to `dist/index.js` is correct

### Step 4: Restart Antigravity IDE

Close and reopen Antigravity IDE to load the new config.

### Step 5: Verify in Manage MCP Servers

1. In Antigravity IDE, open **Manage MCP Servers**
2. Find `blender-mcp`
3. Status should show **Connected** ✅

---

## 🚀 Starting the Connection

### Every Time You Want to Use Blender MCP:

**Step 1: Start Blender**
- Open Blender

**Step 2: Start MCP Server in Blender**
1. Press `N` to open the sidebar
2. Click the **MCP** tab
3. Click **Start Server**
4. Status should show "Running on ws://127.0.0.1:9876"

**Step 3: Open Antigravity IDE**
- MCP will auto-connect

**Step 4: Test Connection**

Type this prompt:
```
Check Blender connection status
```

Successful response:
```json
{"ok":1,"v":"4.2.0","objs":3}
```

---

## 🎮 Basic Usage

### Creating Simple Objects

**Cube:**
```
Create a cube in Blender
```

**Sphere with Material:**
```
Create a red metallic sphere
```

**Multiple Objects:**
```
Create a table with 4 chairs around it
```

### Applying Materials

**Basic Material:**
```
Make the cube blue glass material
```

**Available Presets:**
- METAL - Metallic surface
- GLASS - Transparent glass
- WOOD - Wooden texture
- PLASTIC - Plastic material
- MATTE - Matte/diffuse
- GLOW - Emissive/glowing

### Exporting Models

**Export as GLB:**
```
Export the scene as GLB file
```

**Export specific object:**
```
Export the Cube as FBX to my desktop
```

---

## 🔥 Advanced Usage

### Using Blueprint System

Blueprint generates complex models with correct structure.

**Buildings:**
```
Create a cyberpunk building with neon signs
```
```
Create a medieval castle with towers
```
```
Create a scifi space station
```

**Weapons:**
```
Create an AWP sniper rifle, low poly
```
```
Create a fantasy sword with glowing blade
```

**Vehicles:**
```
Create a sports car with neon underglow
```

**Characters/Robots:**
```
Create a simple robot character
```

### Using Custom Blueprint

For models not in preset:

```
Create a custom dragon with wings and tail
```
```
Create a dog character, low poly style
```

Supported custom types:
- Creatures: dog, cat, wolf, dragon, bird
- Characters: human, orc, elf, zombie
- Objects: sword, chair, chest, tree

### AI-Assisted Sculpting

Modify existing meshes:

**Add Details:**
```
Take the sphere and add horns on top
```
```
Make the cube have a nose and eye sockets
```

**Modify Shape:**
```
Stretch the cylinder taller
```
```
Pinch the waist of that sphere
```
```
Flatten the top of the cone
```

**Sculpt Operations:**
- `smooth` - Smooth the mesh
- `horn/spike` - Add protrusion upward
- `nose` - Push front forward
- `eye socket` - Create indentation
- `stretch` - Elongate vertically
- `pinch waist` - Narrow the middle
- `flatten` - Flatten the top
- `bevel` - Smooth edges
- `noise` - Add roughness

### Preview & Revision

AI can "see" results and revise:

```
Create a low poly tree, then show me a preview
```

After preview:
```
The leaves look too small, make them bigger
```

### Complete Workflow Example

**Game Asset Pipeline:**
```
Create a rock formation for RPG game:
- Low poly style
- Stone material
- Optimize for mobile
- Bake normal map
- Export as GLB
```

AI will execute these steps:
1. Generate rock with blueprint
2. Apply stone material
3. Optimize mesh (reduce polygons)
4. Bake normal map
5. Export to GLB

---

## 📚 Tool Reference

### Core Tools

| Tool | Usage | Example Prompt |
|------|-------|----------------|
| `status` | Check connection | "Check Blender status" |
| `scene` | List objects | "What objects are in the scene?" |
| `prim` | Create primitive | "Create a cube at origin" |
| `export` | Export model | "Export scene as GLB" |

### Material & Texture

| Tool | Usage | Example Prompt |
|------|-------|----------------|
| `mat` | Set material | "Make it metallic red" |
| `tex` | Apply texture | "Apply wood texture to table" |
| `gentex` | AI texture | "Generate stone texture and apply" |

### Generation

| Tool | Usage | Example Prompt |
|------|-------|----------------|
| `proc` | Procedural | "Generate a tree" |
| `blueprint` | Complex model | "Create a building" |
| `sculpt` | Modify mesh | "Add horns to sphere" |

### Optimization & Export

| Tool | Usage | Example Prompt |
|------|-------|----------------|
| `opt` | Reduce polys | "Optimize for mobile" |
| `bake` | Bake textures | "Bake normal map" |
| `render` | Full render | "Render the scene" |
| `preview` | Quick preview | "Show me a preview" |

### Advanced

| Tool | Usage | Example Prompt |
|------|-------|----------------|
| `pipe` | Workflow | "Step by step: create, texture, export" |
| `parse` | Analyze | (internal use) |
| `run` | Custom Python | "Run this bpy script..." |

---

## 💡 Tips & Best Practices

### 1. Be Specific
❌ "Make something cool"
✅ "Create a low-poly medieval house with stone walls and wooden roof"

### 2. Use Style Keywords
- `low poly` - Simple geometry
- `cyberpunk` - Neon, metal, futuristic
- `medieval` - Stone, wood, fantasy
- `scifi` - Sleek, high-tech

### 3. Specify Materials
✅ "Red metallic cube"
✅ "Glowing blue sphere"
✅ "Wooden table with glass top"

### 4. Use Preview for Complex Models
```
Create a dragon, then preview it
```
Check the result, then revise if needed.

### 5. Export Format Guide
- **GLB** - Best for web, Unity, general use
- **FBX** - Best for Unreal, animation
- **OBJ** - Universal, no materials

### 6. Optimization Tips
```
Create a detailed model, then optimize to 50% for mobile
```

---

## ❓ Common Issues

### "Blender not connected"
1. Make sure Blender is running
2. Click "Start Server" in the MCP panel
3. Restart Antigravity IDE

### "Model looks wrong"
```
Preview the current scene
```
Then revise based on what you see.

### "Too many polygons"
```
Optimize the mesh to 30% of original
```

---

## 🎯 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│ BLENDER MCP QUICK REFERENCE                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ CREATE:    "Create a [material] [object]"                       │
│            "Create a red metallic cube"                         │
│                                                                  │
│ BLUEPRINT: "Create a [style] [type]"                            │
│            "Create a cyberpunk building"                        │
│                                                                  │
│ SCULPT:    "Make the [object] [operation]"                      │
│            "Make the sphere have horns"                         │
│                                                                  │
│ EXPORT:    "Export as [format]"                                 │
│            "Export scene as GLB"                                │
│                                                                  │
│ PREVIEW:   "Show me a preview"                                  │
│            "Preview from front angle"                           │
│                                                                  │
│ OPTIMIZE:  "Optimize for [target]"                              │
│            "Optimize for mobile"                                │
│                                                                  │
│ MATERIALS: METAL, GLASS, WOOD, PLASTIC, MATTE, GLOW            │
│ STYLES:    CYBERPUNK, MEDIEVAL, SCIFI, MODERN, FANTASY         │
│ FORMATS:   GLB, FBX, OBJ                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Happy Creating! 🎨**
