"""
Renderer Service (Python)
High-performance image processing and mockup generation
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageEnhance, ImageFilter
import io
import os
from typing import Optional

app = FastAPI(title="GSB Renderer Service")

PORT = int(os.getenv("PORT", "4002"))

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/generate-mockup")
async def generate_mockup(
    design_image: UploadFile = File(...),
    product_template: Optional[UploadFile] = File(None),
    width: int = 800,
    height: int = 600
):
    """Generate product mockup"""
    try:
        # Load design image
        design_bytes = await design_image.read()
        design_img = Image.open(io.BytesIO(design_bytes))
        
        # Resize if needed
        if design_img.size != (width, height):
            design_img = design_img.resize((width, height), Image.Resampling.LANCZOS)
        
        # If template provided, composite
        if product_template:
            template_bytes = await product_template.read()
            template_img = Image.open(io.BytesIO(template_bytes))
            
            # Composite design onto template
            if template_img.mode != 'RGBA':
                template_img = template_img.convert('RGBA')
            if design_img.mode != 'RGBA':
                design_img = design_img.convert('RGBA')
            
            result = Image.alpha_composite(template_img, design_img)
        else:
            result = design_img
        
        # Convert to PNG
        output = io.BytesIO()
        result.save(output, format='PNG', optimize=True)
        output.seek(0)
        
        return Response(content=output.getvalue(), media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize-image")
async def optimize_image(
    image: UploadFile = File(...),
    target_dpi: int = 300,
    enhance_quality: bool = True
):
    """Optimize image for printing"""
    try:
        image_bytes = await image.read()
        img = Image.open(io.BytesIO(image_bytes))
        
        # Enhance quality
        if enhance_quality:
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.2)
            
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.1)
        
        # Set DPI
        img.info['dpi'] = (target_dpi, target_dpi)
        
        # Optimize
        output = io.BytesIO()
        img.save(output, format='PNG', optimize=True, dpi=(target_dpi, target_dpi))
        output.seek(0)
        
        return Response(content=output.getvalue(), media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upscale")
async def upscale_image(
    image: UploadFile = File(...),
    scale_factor: float = 2.0
):
    """AI upscaling (simple version)"""
    try:
        image_bytes = await image.read()
        img = Image.open(io.BytesIO(image_bytes))
        
        # Calculate new size
        new_width = int(img.width * scale_factor)
        new_height = int(img.height * scale_factor)
        
        # Upscale with LANCZOS (high quality)
        upscaled = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Sharpen slightly
        upscaled = upscaled.filter(ImageFilter.SHARPEN)
        
        output = io.BytesIO()
        upscaled.save(output, format='PNG', optimize=True)
        output.seek(0)
        
        return Response(content=output.getvalue(), media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")

