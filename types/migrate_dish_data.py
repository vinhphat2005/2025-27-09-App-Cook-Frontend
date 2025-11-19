# scripts/migrate_dish_data.py
"""
Migration script to ensure all dishes have proper fields:
- view_count (default 0)
- average_rating (calculated or default 0)
- ratings array (empty if not exists)
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from datetime import datetime

MONGO_URI = "your_mongo_uri_here"
DATABASE_NAME = "cook_app"

async def migrate_dishes():
    """Ensure all dishes have required fields"""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    
    print("🔄 Starting dish migration...")
    
    # Get all dishes
    dishes = await db.dishes.find({}).to_list(length=None)
    total = len(dishes)
    updated = 0
    
    for i, dish in enumerate(dishes, 1):
        updates = {}
        
        # Add view_count if missing
        if "view_count" not in dish:
            updates["view_count"] = 0
        
        # Ensure ratings array exists
        if "ratings" not in dish or dish["ratings"] is None:
            updates["ratings"] = []
        
        # Calculate average_rating if missing or outdated
        ratings_array = dish.get("ratings", [])
        if ratings_array:
            avg = sum(r.get("rating", 0) for r in ratings_array) / len(ratings_array)
            updates["average_rating"] = round(avg, 2)
        elif "average_rating" not in dish:
            updates["average_rating"] = 0.0
        
        # Ensure like_count exists
        if "like_count" not in dish:
            # Calculate from liked_by array
            liked_by = dish.get("liked_by", [])
            updates["like_count"] = len(liked_by) if liked_by else 0
        
        # Ensure cook_count exists
        if "cook_count" not in dish:
            updates["cook_count"] = 0
        
        # Update if needed
        if updates:
            await db.dishes.update_one(
                {"_id": dish["_id"]},
                {"$set": updates}
            )
            updated += 1
        
        if i % 100 == 0:
            print(f"Progress: {i}/{total} dishes processed")
    
    print(f"✅ Migration complete!")
    print(f"   Total dishes: {total}")
    print(f"   Updated: {updated}")
    
    client.close()

async def migrate_user_activities():
    """Ensure all user_activities have proper structure"""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    
    print("🔄 Starting user_activity migration...")
    
    activities = await db.user_activity.find({}).to_list(length=None)
    total = len(activities)
    updated = 0
    
    for i, activity in enumerate(activities, 1):
        updates = {}
        
        # Ensure arrays exist
        for field in ["favorite_dishes", "cooked_dishes", "viewed_dishes", 
                      "created_recipes", "created_dishes"]:
            if field not in activity:
                updates[field] = []
        
        # Ensure viewed_dishes_and_users exists
        if "viewed_dishes_and_users" not in activity:
            updates["viewed_dishes_and_users"] = []
        
        # Add updated_at if missing
        if "updated_at" not in activity:
            updates["updated_at"] = datetime.utcnow()
        
        if updates:
            await db.user_activity.update_one(
                {"_id": activity["_id"]},
                {"$set": updates}
            )
            updated += 1
    
    print(f"✅ User activity migration complete!")
    print(f"   Total activities: {total}")
    print(f"   Updated: {updated}")
    
    client.close()

async def create_indexes():
    """Create necessary indexes for better performance"""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    
    print("📊 Creating indexes...")
    
    # Dishes indexes
    await db.dishes.create_index([("average_rating", -1)])
    await db.dishes.create_index([("like_count", -1)])
    await db.dishes.create_index([("cook_count", -1)])
    await db.dishes.create_index([("view_count", -1)])
    await db.dishes.create_index([("created_at", -1)])
    await db.dishes.create_index([("is_active", 1)])
    await db.dishes.create_index([("category", 1)])
    await db.dishes.create_index([("cuisine_type", 1)])
    await db.dishes.create_index([("tags", 1)])
    
    # Compound indexes for recommendations
    await db.dishes.create_index([
        ("is_active", 1),
        ("average_rating", -1),
        ("like_count", -1)
    ])
    
    # User activity indexes
    await db.user_activity.create_index([("user_id", 1)], unique=True)
    await db.user_activity.create_index([("updated_at", -1)])
    await db.user_activity.create_index([("favorite_dishes", 1)])
    
    print("✅ Indexes created successfully!")
    
    client.close()

async def main():
    print("=" * 60)
    print("   Recommendation System Migration")
    print("=" * 60)
    
    try:
        await migrate_dishes()
        await migrate_user_activities()
        await create_indexes()
        
        print("\n" + "=" * 60)
        print("   ✅ All migrations completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())