# Data Model: 012-branding-cleanup

## UI Mapping Schema

The `aiHealthStore` uses provider keys to track service status. We will transition from legacy names to branded names in the display layer.

### Provider Status Mapping
| Legacy Key | Display Name | Internal Alignment |
| :--- | :--- | :--- |
| `lovable` | `WiseResume AI` | Built-in AI Gateway |
| `lovable-gateway` | `WiseResume AI` | Legacy alias |
| `lovable_fallback` | `WiseResume AI (Fallback)` | Resilience worker |

## Sample Data Updates

### Resume Template Entity
- **Name**: "Wise Portfolio" (formerly "Wise Megz")
- **Work Email**: `contact@thewise.cloud`
- **Portfolio URL**: `https://resume.thewise.cloud`
