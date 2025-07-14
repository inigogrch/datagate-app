# DataGate Database Migrations

## 🚨 **Production Schema Reset & Setup**

### **Step 1: Reset Database (Clean Slate)**
Run this in your **Supabase SQL Editor**:
```sql
-- Run: supabase/migrations/000_reset_database.sql
```
**⚠️ WARNING**: This deletes ALL existing data! Use only for development or explicit resets.

### **Step 2: Apply Final Schema**
Run this in your **Supabase SQL Editor**:
```sql  
-- Run: supabase/migrations/008_finalize_production_schema.sql
```

### **Quick Commands**
```bash
# Get migration instructions
npm run db:reset    # Shows reset command
npm run db:finalize # Shows finalization command
```

---

## 📋 **Migration Files**

### **Active Migrations**
- **`000_reset_database.sql`** - Complete database reset (⚠️ destructive)
- **`008_finalize_production_schema.sql`** - Final production schema

### **Legacy Migrations** (Reference Only)
- `001_initial_schema.sql` - Original schema
- `002_add_sources_wave1.sql` - Added sources table  
- `003_add_external_id.sql` - Added external_id field
- `004_add_web_scrape_type.sql` - Added web scraping support
- `005_flexible_story_metadata.sql` - Added flexible metadata
- `006_add_embeddings.sql` - Added vector embeddings
- `007_remove_category_column.sql` - Removed hardcoded categories

---

## 🎯 **Final Schema Features**

The finalized schema includes:

### **Stories Table**
- ✅ All enhanced metadata fields (`summary`, `author`, `image_url`, `story_category`)
- ✅ Vector embeddings for semantic search
- ✅ Comprehensive indexing for performance
- ✅ Rich metadata preservation (`original_metadata`, `tagging_metadata`)

### **Views**
- ✅ `story_cards` - Optimized for UI display
- ✅ `story_analytics` - Dashboard and metrics
- ✅ `stories_missing_embeddings` - Monitoring coverage
- ✅ `stories_missing_metadata` - Quality tracking

### **Functions**
- ✅ `search_stories_by_similarity()` - Vector similarity search

---

## 🔧 **Troubleshooting**

### **Error: "relation already exists"**
1. Run **`000_reset_database.sql`** first
2. Then run **`008_finalize_production_schema.sql`**

### **Error: "extension does not exist"**
- Enable `vector` extension in Supabase Dashboard
- Enable `btree_gin` extension in Supabase Dashboard

### **Error: "function does not exist"**
- Make sure pgvector is enabled
- Run the reset script first

---

## ✅ **After Migration**

1. **Test the schema**:
   ```bash
   npm run test:adapters
   ```

2. **Run production ingestion**:
   ```bash
   npm run ingest:production:all
   ```

3. **Verify data**:
   ```sql
   SELECT COUNT(*) FROM stories;
   SELECT COUNT(*) FROM sources;
   ```

**The database is now production-ready! 🚀** 