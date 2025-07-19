# Weight Estimation Tool

A React-based web application that generates 3D models from images using Hunyuan3D-2 and calculates their volume for weight estimation.

## Features

- 🖼️ **Image Upload**: Drag & drop or click to upload images (PNG, JPG, JPEG, WebP)
- 📝 **Description Input**: Add detailed descriptions to improve 3D model generation
- 🎯 **3D Model Generation**: Uses Hunyuan3D-2 AI model to create high-quality 3D models
- 📐 **Volume Calculation**: Precise volume calculation using the divergence theorem
- 🎨 **3D Viewer**: Interactive 3D model viewer with rotation, zoom, and pan controls
- 💾 **Model Export**: Download generated models as GLB files
- 📊 **Detailed Analysis**: View model statistics including dimensions, vertices, and faces

## Prerequisites

This application uses the **Replicate API** to access Hunyuan3D-2, so you need:

### 1. Replicate Account & API Token

1. **Sign up** at [replicate.com](https://replicate.com)
2. **Get your API token** from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
3. **Copy the token** (starts with `r8_...`)

### 2. Cost Information

- **Cost**: ~$0.24 per 3D model generation
- **Payment**: Pay-as-you-use through Replicate
- **No setup required**: Everything runs in the cloud

## Installation

1. **Clone this repository**
```bash
git clone <your-repo-url>
cd weight-estimation
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:5173` (or the port shown in terminal)

## Usage

1. **Configure API**: Enter your Replicate API token in the configuration section
2. **Upload an Image**: Drag and drop an image or click to select one
3. **Add Description** (Optional): Provide a detailed description of the object to improve 3D generation
4. **Generate Model**: Click the "Generate 3D Model & Calculate Volume" button
5. **View Results**: Explore the interactive 3D model and view volume calculations
6. **Download**: Save the generated GLB file for use in other applications

## Technical Details

### Volume Calculation

The application calculates volume using the **divergence theorem** method:
- Processes each triangle in the mesh
- Calculates volume contribution using cross products
- Sums all contributions for total volume
- Accounts for mesh transformations and scaling

### 3D Model Processing

- **Format**: GLB (Binary glTF) files
- **Loader**: Three.js GLTFLoader
- **Rendering**: React Three Fiber with Three.js
- **Controls**: Orbit controls for interaction

### API Integration

- **Service**: Hunyuan3D-2 via Replicate API
- **Authentication**: API token-based
- **Timeout**: 5 minutes for generation
- **Error Handling**: Comprehensive error messages and retry suggestions
- **Progress**: Real-time status updates
- **Cost**: ~$0.24 per generation

## Project Structure

```
src/
├── components/
│   ├── ImageUpload.jsx       # Image upload with drag & drop
│   ├── DescriptionInput.jsx  # Text input for descriptions
│   ├── ModelViewer.jsx       # 3D model viewer and analysis
│   └── LoadingSpinner.jsx    # Loading states and progress
├── services/
│   └── hunyuan3d.js         # API communication service
├── utils/
│   └── volumeCalculator.js   # Volume calculation algorithms
├── App.jsx                   # Main application component
└── main.jsx                  # Application entry point
```

## Configuration

### API Configuration

You can modify the API configuration in `src/services/hunyuan3d.js`:

```javascript
const API_CONFIG = {
  baseURL: 'http://localhost:8080', // API server URL
  timeout: 300000, // 5 minutes timeout
}
```

### Generation Parameters

Default parameters for 3D generation:
- **Octree Resolution**: 128
- **Inference Steps**: 5
- **Guidance Scale**: 5.0
- **Max Faces**: 40,000

## Troubleshooting

### Common Issues

1. **"Unable to connect to 3D generation service"**
   - Ensure the Hunyuan3D-2 API server is running on port 8080
   - Check if the server URL is correct in the configuration

2. **"Generation failed" errors**
   - Try with a different image
   - Ensure the image is clear and shows a single object
   - Check server logs for detailed error messages

3. **Volume calculation seems incorrect**
   - Volume is calculated in model units (not real-world units)
   - Complex or non-watertight meshes may affect accuracy
   - Consider the mesh quality and topology

### Performance Tips

- Use images with clear, well-lit objects
- Avoid cluttered backgrounds (or use images with transparent backgrounds)
- Provide detailed descriptions for better results
- Ensure sufficient GPU memory for large models

## Dependencies

- **React 19**: UI framework
- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **React Three Drei**: Useful helpers for R3F
- **Axios**: HTTP client for API requests
- **React Dropzone**: File upload component

## License

This project is for educational and research purposes. Please check the Hunyuan3D-2 license for commercial usage restrictions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues related to:
- **3D Generation**: Check the [Hunyuan3D-2 repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2)
- **This Application**: Open an issue in this repository
