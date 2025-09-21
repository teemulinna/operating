# Google Stitch MCP Server

A Model Context Protocol (MCP) server for integrating with Google Stitch AI design tool.

## Features

- **Generate Designs**: Create UI designs using natural language prompts
- **Retrieve Designs**: Get details of existing designs by ID
- **List Designs**: Browse all designs in your account
- **Export Designs**: Export designs in various formats (JSON, Figma, React, HTML)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Stitch API credentials
```

## Configuration

Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["/path/to/config/stitch-mcp/dist/index.js"],
      "env": {
        "STITCH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Environment Variables

- `STITCH_API_KEY`: Your Google Stitch API key (required)
- `STITCH_API_URL`: API endpoint URL (optional, defaults to official endpoint)

## Usage

### Generate a Design
```
Generate a mobile app design for a fitness tracker with a modern, minimalist style
```

### Get Design Details
```
Get details for design ID: abc123
```

### List Designs
```
Show me all my mobile app designs
```

### Export Design
```
Export design abc123 as React components
```

## API Integration

This MCP server integrates with Google Stitch's API to provide:
- Design generation using AI
- Design management and retrieval
- Export functionality for various formats
- Platform-specific design generation (mobile/web)

## Notes

- Google Stitch is currently in beta
- API access may require special permissions
- Some features may be limited based on your account type

## Troubleshooting

1. **API Key Issues**: Ensure your `STITCH_API_KEY` is valid and has proper permissions
2. **Network Issues**: Check your internet connection and firewall settings
3. **Rate Limits**: The API may have rate limits; implement retry logic if needed

## Contributing

This is a custom MCP server created for Google Stitch integration. Feel free to extend it with additional features as the Stitch API evolves.