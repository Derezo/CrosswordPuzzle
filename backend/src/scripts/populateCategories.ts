import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface DictionaryEntry {
  word: string;
  clue: string;
  is_technical_word: string | boolean;
  is_common_english: string | boolean;
  is_plural: string | boolean;
  categories: string;
  obscure: string | boolean;
}

async function populateCategories() {
  try {
    console.log('📚 Reading dictionary CSV...');
    const csvPath = path.join(__dirname, '../data/crossword_dictionary_with_clues.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    }) as DictionaryEntry[];

    console.log(`📊 Found ${records.length} dictionary entries`);

    // Count words per category
    const categoryMap = new Map<string, { count: number; description?: string }>();
    
    for (const record of records) {
      // Skip obscure words
      if (record.obscure === "True" || record.obscure === true || record.obscure === "true") {
        continue;
      }
      
      // Parse categories (comma-separated)
      if (record.categories && typeof record.categories === 'string') {
        const categories = record.categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);
        
        for (const category of categories) {
          if (!categoryMap.has(category)) {
            categoryMap.set(category, { count: 0, description: `Category for ${category} related words` });
          }
          const current = categoryMap.get(category)!;
          current.count++;
        }
      }
    }

    console.log(`🔍 Found ${categoryMap.size} unique categories`);

    // Insert or update categories in database
    for (const [categoryName, data] of categoryMap.entries()) {
      await prisma.puzzleCategory.upsert({
        where: { name: categoryName },
        update: {
          wordCount: data.count,
          updatedAt: new Date()
        },
        create: {
          name: categoryName,
          description: data.description || `Category containing ${data.count} words`,
          wordCount: data.count,
          favoritesCount: 0,
          isActive: true
        }
      });
      console.log(`✅ Category: ${categoryName} (${data.count} words)`);
    }

    console.log('🎉 Categories successfully populated!');
    
    // Show summary
    const totalCategories = await prisma.puzzleCategory.count();
    const topCategories = await prisma.puzzleCategory.findMany({
      orderBy: { wordCount: 'desc' },
      take: 5
    });

    console.log(`\n📊 Summary:`);
    console.log(`Total categories: ${totalCategories}`);
    console.log(`\nTop 5 categories by word count:`);
    topCategories.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.name}: ${cat.wordCount} words`);
    });

  } catch (error) {
    console.error('❌ Error populating categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

populateCategories();
