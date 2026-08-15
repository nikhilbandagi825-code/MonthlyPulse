import asyncio, os
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

async def main():
    gen = OpenAIImageGeneration(api_key=os.environ.get('EMERGENT_LLM_KEY'))
    images = await gen.generate_images(
        prompt=(
            "Modern minimalist mobile app icon for a calm personal budgeting app called MonthlyPulse. "
            "Flat design, a soft rounded wallet or coin with a gentle pulse/heartbeat line running through it, "
            "serene teal and deep navy color palette with a soft gradient background, clean geometric shapes, "
            "no text, centered composition, square 1:1 format, high quality app store icon style"
        ),
        model="gpt-image-1",
        number_of_images=1,
    )
    with open('/app/generated_app_icon.png', 'wb') as f:
        f.write(images[0])
    print('saved', len(images[0]), 'bytes')

asyncio.run(main())
