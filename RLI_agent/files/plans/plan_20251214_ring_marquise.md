# RLI Execution Plan: Ring Design Modification (Emerald to Marquise Diamond)

**Plan ID:** plan_20251214_ring_marquise
**Timestamp:** 2025-12-14
**Task Type:** 3D Model Flow - Jewelry Design & Rendering
**Status:** Ready for Orchestration

---

## Task Analysis

### Request Summary
Modify an existing ring design by replacing the emerald-cut diamond with a marquise-cut diamond. Generate a 3D model in .3dm format (Rhinoceros) and render high-resolution JPEG images showing the modified ring in two gold variants (rose gold and yellow gold) with multiple viewing angles.

### Detected Flow
**3D Model Flow** - Combines image generation, 3D model creation, and professional rendering

### Deliverables Required
1. 3D model file in .3dm format (Rhinoceros CAD format) with marquise-cut diamond
2. Rose gold version, front view (JPEG, minimum 1280x1280 pixels)
3. Rose gold version, side angle view (JPEG, minimum 1280x1280 pixels)
4. Yellow gold version, front view (JPEG, minimum 1280x1280 pixels)
5. Yellow gold version, side angle view (JPEG, minimum 1280x1280 pixels)

---

## Input Assets

**Reference Image URL:**
https://firebasestorage.googleapis.com/v0/b/kizuna-76f7c.firebasestorage.app/o/attachments%2F1765759317116_ringdetails.png?alt=media&token=da359d1a-5714-4ba2-b5cf-d767c527797d

**Reference Content:**
- Original ring design with emerald-cut diamond
- Includes weight, size, and specifications
- Design elements to preserve: band design, setting style, metal type, surface finishing

**Key Design Parameters to Maintain:**
- Ring band width and profile
- Setting type and height
- Metal composition (gold purity)
- Any design details or engravings
- Overall ring proportions

---

## Execution Flow

### 3D Jewelry Model & Rendering Pipeline

**Step 1: Reference Image Analysis**
- **Agent:** Image Analyzer / Document Extractor
- **Task:** Extract detailed ring specifications from reference image
- **Input:**
  - Reference image URL (containing original emerald-cut ring design)
  - Analysis keywords: diamond weight, carat, dimensions (length/width/depth), band width, band profile, setting style, metal type, finish details
- **Expected Output:**
  - Design specification document with:
    - Original emerald-cut diamond dimensions
    - Marquise-cut conversion specifications (maintaining approximate carat weight)
    - Band measurements and geometry
    - Metal type and finish details
    - Setting mechanism details
    - Ring size information
- **Output ID:** SPEC-001

**Step 2: Image Generator - Rose Gold Front View (Reference)**
- **Agent:** Image Generator (FAL/Gemini)
- **Task:** Generate high-quality rendering of ring with marquise-cut diamond in rose gold, front view
- **Input:**
  - From SPEC-001: Diamond specs, band design, metal type
  - Detailed prompt: "Professional jewelry photography of a luxury engagement ring with a marquise-cut diamond, rose gold band, elegant solitaire setting with delicate metal band, white background, direct front view (12 o'clock angle), studio lighting with soft key light and fill light creating subtle highlights on facets, sharp focus on diamond brilliance, high-resolution product photography, 4K quality, minimum 1280x1280 pixels, professional polish showing diamond sparkle and rose gold metallic luster"
- **Expected Output:** High-resolution JPEG image of rose gold ring, front view
- **Output ID:** IMAGE-RGFR-001

**Step 3: Image Generator - Rose Gold Side Angle View (Reference)**
- **Agent:** Image Generator (FAL/Gemini)
- **Task:** Generate high-quality rendering of ring with marquise-cut diamond in rose gold, side angle
- **Input:**
  - From SPEC-001: Diamond specs, band design, metal type
  - Detailed prompt: "Professional jewelry photography of a luxury engagement ring with a marquise-cut diamond, rose gold band, elegant solitaire setting, white background, 45-degree side profile view showing ring thickness and diamond height, studio lighting consistent with front view, sharp focus, professional product photography, minimum 1280x1280 pixels, 4K quality, showing clear marquise diamond profile, rose gold band luster and surface finish details"
- **Expected Output:** High-resolution JPEG image of rose gold ring, side angle
- **Output ID:** IMAGE-RGSA-002

**Step 4: Image Generator - Yellow Gold Front View (Reference)**
- **Agent:** Image Generator (FAL/Gemini)
- **Task:** Generate high-quality rendering of ring with marquise-cut diamond in yellow gold, front view
- **Input:**
  - From SPEC-001: Diamond specs, band design
  - Detailed prompt: "Professional jewelry photography of a luxury engagement ring with a marquise-cut diamond, yellow gold band, elegant solitaire setting, white background, direct front view (12 o'clock angle), studio lighting with soft key light and fill light, sharp focus on diamond brilliance and facet sparkle, high-resolution product photography, 4K quality, minimum 1280x1280 pixels, warm yellow gold metallic finish with professional shine, accurate gold color tone (warmer than rose gold), professional jewelry render"
- **Expected Output:** High-resolution JPEG image of yellow gold ring, front view
- **Output ID:** IMAGE-YGFR-003

**Step 5: Image Generator - Yellow Gold Side Angle View (Reference)**
- **Agent:** Image Generator (FAL/Gemini)
- **Task:** Generate high-quality rendering of ring with marquise-cut diamond in yellow gold, side angle
- **Input:**
  - From SPEC-001: Diamond specs, band design
  - Detailed prompt: "Professional jewelry photography of a luxury engagement ring with a marquise-cut diamond, yellow gold band, elegant solitaire setting, white background, 45-degree side profile view showing ring dimensions and diamond profile, studio lighting consistent with other renders, sharp focus, professional product photography, minimum 1280x1280 pixels, 4K quality, marquise diamond side profile visible, warm yellow gold finish clearly visible, surface detail and luster"
- **Expected Output:** High-resolution JPEG image of yellow gold ring, side angle
- **Output ID:** IMAGE-YGSA-004

**Step 6: 3D Model Extractor - Generate CAD Model**
- **Agent:** Model Extractor / 3D Converter (FAL or specialized tool)
- **Task:** Convert ring images to 3D model in Rhinoceros (.3dm) format
- **Input:**
  - Primary reference images: IMAGE-RGFR-001 (front) + IMAGE-RGSA-002 (side angle)
  - Additional reference: IMAGE-YGFR-003, IMAGE-YGSA-004 (for color verification and detail accuracy)
  - Model parameters:
    - Output format: .3dm (Rhinoceros 3D)
    - Mesh quality: High-detail for jewelry manufacturing
    - Texture resolution: 2048x2048 (for gold surfaces and diamond facets)
    - Include both material variants (rose gold and yellow gold as separate objects/layers)
- **Expected Output:** 3D model file (.3dm format) containing:
  - Complete ring assembly with marquise-cut diamond
  - Accurate band geometry and setting
  - Faceted diamond model showing marquise proportions
  - Material properties for both gold variants
  - Production-ready geometry
  - Proper dimensions matching reference specifications
- **Output ID:** MODEL-3DM-001

**Step 7: Quality Verification & Delivery Preparation**
- **Agent:** QA Reviewer / Deliverables Manager
- **Task:** Verify all outputs meet specifications and prepare final delivery package
- **Input:** All generated assets
  - MODEL-3DM-001 (3D model)
  - IMAGE-RGFR-001 (rose gold front)
  - IMAGE-RGSA-002 (rose gold side)
  - IMAGE-YGFR-003 (yellow gold front)
  - IMAGE-YGSA-004 (yellow gold side)
- **Verification Checklist:**
  - 3D model uses marquise-cut diamond (not emerald-cut)
  - All original design elements are preserved (band design, setting style, metal type)
  - File format is .3dm as required
  - Both metal variants are present (rose gold and yellow gold distinctly different)
  - All JPEG images are minimum 1280x1280 pixels resolution
  - Image quality meets professional jewelry photography standards
  - Lighting and reflections are consistent across related views (rose gold set, yellow gold set)
  - Marquise diamond shape is clearly visible and accurate
  - Color accuracy: rose gold has warm pink tone, yellow gold has warm yellow tone
- **Expected Output:** Quality verification report and finalized file package
- **Output ID:** QA-001

---

## Agent Sequence Summary

1. **Image Analyzer** - Extract ring specifications from reference image (SPEC-001)
2. **Image Generator** - Create rose gold front view render (IMAGE-RGFR-001)
3. **Image Generator** - Create rose gold side angle render (IMAGE-RGSA-002)
4. **Image Generator** - Create yellow gold front view render (IMAGE-YGFR-003)
5. **Image Generator** - Create yellow gold side angle render (IMAGE-YGSA-004)
6. **Model Extractor** - Convert images to 3D .3dm model (MODEL-3DM-001)
7. **QA Reviewer** - Verify all deliverables and prepare package (QA-001)

---

## Deliverables Checklist

- [ ] **3D Model (.3dm):** Ring with marquise-cut diamond, both metal variants, production-ready geometry - MODEL-3DM-001
- [ ] **Rose Gold Front View (JPEG):** 1280x1280px minimum, professional studio render, front view - IMAGE-RGFR-001
- [ ] **Rose Gold Side View (JPEG):** 1280x1280px minimum, professional studio render, 45-degree angle - IMAGE-RGSA-002
- [ ] **Yellow Gold Front View (JPEG):** 1280x1280px minimum, professional studio render, front view - IMAGE-YGFR-003
- [ ] **Yellow Gold Side View (JPEG):** 1280x1280px minimum, professional studio render, 45-degree angle - IMAGE-YGSA-004

---

## Technical Specifications

### Diamond Shape Conversion
- **Original:** Emerald-cut diamond
- **New:** Marquise-cut diamond
  - Characteristic: Elongated oval with pointed ends
  - Length-to-width ratio: Approximately 2:1
  - Maintains approximate carat weight equivalent
  - Optimal viewing angle: Front view (shows distinctive shape)

### Metal Specifications
- **Rose Gold:** Warm pinkish tone (typically 75% gold with copper/silver alloy)
  - Rendering tone: RGB approximately (255, 200, 150)
  - Reflectance: Warm metallic finish
- **Yellow Gold:** Standard warm yellow tone (typically 75% gold)
  - Rendering tone: RGB approximately (255, 215, 100)
  - Reflectance: Warm yellow metallic finish

### Image Specifications
- Format: JPEG
- Minimum Resolution: 1280x1280 pixels
- Quality: Professional jewelry photography standard
- Background: Clean white or neutral
- Lighting: Studio professional jewelry lighting with proper highlights and shadows

### CAD Model Specifications
- Format: .3dm (Rhinoceros 3D native format)
- Suitable for: Further design refinement, manufacturing, 3D printing
- Detail Level: High-precision jewelry-grade geometry
- Material Variants: Rose gold and yellow gold as separate objects or layers

---

## Notes

- The marquise-cut diamond should maintain approximate carat weight equivalent to the original emerald-cut stone
- All other design elements (band width, profile, setting style, finish) must remain consistent with the reference design
- Lighting and rendering style should match professional jewelry photography standards
- Both metal variants should render with appropriate color tone and reflectance properties
- The .3dm file format is suitable for CAD refinement, manufacturing planning, or 3D printing workflows
- Multiple viewing angles (front and 45-degree side) provide comprehensive product representation
- All renders should demonstrate high-quality jewelry product photography techniques
