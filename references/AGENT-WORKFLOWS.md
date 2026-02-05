# Agent Workflows - Task Allocation Guide

## Overview
This document provides detailed task breakdowns for each development phase, helping agents understand their responsibilities and collaboration points.

## Phase 1: Foundation (Days 1-2)

### Pixel Tasks
1. **Create design system**
   - Define color palette (primary, secondary, accent)
   - Choose typography scale
   - Set spacing system (4px base grid)
   - Define border-radius scale

2. **Build theme system**
   - Light theme variables
   - Dark theme variables
   - 2-3 custom theme concepts
   - Theme switching mechanism

3. **Create component library**
   - Button variants (primary, secondary, ghost)
   - Card/container styles
   - Modal/dialog base
   - Input fields
   - Navigation tabs

4. **Implement glassmorphism**
   - Base glass class
   - Variants for different backgrounds
   - Shadow system
   - Blur fallbacks

### Stack Tasks
1. **Project scaffold**
   - Initialize Vercel project
   - Set up folder structure
   - Configure build tools
   - Set up environment variables

2. **API structure**
   - Create endpoint files
   - Set up routing
   - Implement error handling middleware
   - Create response utilities

3. **Database setup**
   - Choose database (Vercel KV/Firebase)
   - Create connection module
   - Define schema interfaces
   - Set up migrations

4. **Telegram integration**
   - initData verification function
   - User extraction utilities
   - WebApp event listeners

**Collaboration Point**: Pixel and Stack agree on CSS framework and state management approach.

---

## Phase 2: Core Features (Days 3-7)

### Parallel Work Streams

#### Pixel Stream
- Build PLAY screen layout
- Implement game board/grid
- Create card/element components
- Design timer and score displays
- Build win/lose modals
- Animate card flips and matches

#### Stack Stream
- User registration endpoint
- Game state save/load
- XP calculation logic
- Achievement checking functions
- Leaderboard queries

#### Shield Stream (starts here)
- Review data collection points
- Draft privacy policy
- Identify COPPA requirements
- Create compliance checklist

#### Buzz Stream (starts here)
- Research competitor apps
- Draft name options
- Write app descriptions
- Define target audience

#### Check Stream (starts here)
- Create test plan structure
- Document game mechanic test cases
- Identify edge cases
- Set up bug tracking

**Daily Sync**: All agents report progress, blockers, and dependencies.

---

## Phase 3: Monetization (Days 8-10)

### Stack Tasks
1. TON Connect integration
2. Payment transaction creation
3. Webhook verification endpoint
4. Premium status checking
5. Transaction history API

### Shield Tasks
1. Review purchase flows for compliance
2. Draft refund policy
3. Create parental gate specifications
4. Review TON payment disclosures

### Pixel Tasks
1. Design wallet connection UI
2. Create store item cards
3. Design premium unlock flows
4. Implement locked/unlocked states

**Collaboration Point**: Stack provides TON integration docs to Pixel for UI implementation.

---

## Phase 4: Polish (Days 11-13)

### Pixel Tasks
- Fix text contrast on all themes
- Refine animations and transitions
- Optimize CSS (remove unused styles)
- Implement micro-interactions
- Dark mode polish

### Check Tasks
- Execute full test plan
- Verify all achievements unlock
- Test on multiple devices
- Performance profiling
- Security audit

### Stack Tasks
- API response caching
- Database query optimization
- Error monitoring setup
- Rate limiting fine-tuning

**Collaboration Point**: Check reports bugs to respective agents for fixing.

---

## Phase 5: Launch (Days 14-15)

### Buzz Tasks
- Finalize BotFather setup guide
- Create launch announcement posts
- Prepare social media content calendar
- Write user onboarding copy

### Shield Tasks
- Final legal review
- Publish privacy policy
- Publish terms of service
- Compliance certification

### Stack Tasks
- Production deployment
- Domain configuration
- SSL certificate
- Monitoring dashboard setup

### Check Tasks
- Final go/no-go assessment
- Verify all pre-launch items
- Document known issues (if any)

**Final Sync**: All agents confirm their areas are ready for launch.

---

## Daily Standup Template

```
## [Agent Name] - [Date]

### Yesterday
- Completed: [tasks]
- Blockers: [if any]

### Today
- Focus: [main task]
- Collaborations: [who I'm working with]

### Needs Help
- [Questions or dependencies]
```

---

## Handoff Checklist

When one agent completes work that another depends on:

1. **Document the work**
   - What was done
   - How to use it
   - Known limitations

2. **Provide examples**
   - Code snippets
   - Usage patterns
   - Test cases

3. **Communicate clearly**
   - Tag the receiving agent
   - Explain integration points
   - Offer to pair if needed

4. **Verify understanding**
   - Receiving agent confirms they have what they need
   - Ask questions before starting
   - Clarify ambiguities
