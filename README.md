# Shift Scheduler

A clean calendar-based employee shift scheduler connected to Notion.

## Setup

### 1. Notion Databases
Create 3 Notion databases (see below for column setup), get their IDs from the URL.

### 2. Notion Integration
- Go to https://www.notion.so/my-integrations
- Create a new integration, copy the token
- Share each database with your integration

### 3. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
```
NOTION_TOKEN=secret_xxx
NOTION_EMPLOYEES_DB=abc123...
NOTION_TIMESLOTS_DB=def456...
NOTION_SHIFTS_DB=ghi789...
```

### 4. Vercel Deployment
Add the same 4 env vars in Vercel project settings → Environment Variables.

## Local Dev
```bash
npm install
npm run dev
```

## Database Schemas

### Employees
| Column | Type |
|--------|------|
| Name | Title |
| Active | Checkbox |
| Created | Created time |

### Time Slots
| Column | Type |
|--------|------|
| Label | Title |
| Start Time | Text |
| End Time | Text |
| Active | Checkbox |

### Shifts
| Column | Type |
|--------|------|
| Title | Title |
| Employee | Relation → Employees |
| Date | Date |
| Time Slot | Relation → Time Slots |
| Notes | Text |
