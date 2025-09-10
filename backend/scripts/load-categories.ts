import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

interface DictionaryEntry {
  word: string;
  clue: string;
  is_technical_word: string;
  is_common_english: string;
  is_plural: string;
  categories: string;
}

interface CategoryStats {
  name: string;
  wordCount: number;
  description?: string;
}

async function loadCategoriesFromCsv(): Promise<void> {
  console.log('🔍 Loading categories from crossword dictionary...');
  
  const csvFilePath = path.join(__dirname, '../src/data/crossword_dictionary_with_clues.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at: ${csvFilePath}`);
  }

  const categoryMap = new Map<string, number>();
  const categoryDescriptions = new Map<string, Set<string>>();

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(parse({ 
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (row: DictionaryEntry) => {
        if (row.categories) {
          // Split categories by comma and clean them
          const categories = row.categories.split(',').map(cat => cat.trim().toLowerCase());
          
          categories.forEach(category => {
            if (category && category.length > 0) {
              // Count words per category
              categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
              
              // Collect sample words for descriptions
              if (!categoryDescriptions.has(category)) {
                categoryDescriptions.set(category, new Set());
              }
              const words = categoryDescriptions.get(category)!;
              if (words.size < 3) { // Keep first 3 words as examples
                words.add(row.word.toLowerCase());
              }
            }
          });
        }
      })
      .on('end', async () => {
        try {
          console.log(`📊 Found ${categoryMap.size} unique categories`);
          
          // Convert map to sorted array
          const categoriesArray: CategoryStats[] = Array.from(categoryMap.entries())
            .map(([name, wordCount]) => {
              const sampleWords = Array.from(categoryDescriptions.get(name) || []);
              const description = sampleWords.length > 0 
                ? `Category containing words like: ${sampleWords.slice(0, 3).join(', ')}`
                : `Words related to ${name}`;
              
              return {
                name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
                wordCount,
                description
              };
            })
            .sort((a, b) => b.wordCount - a.wordCount); // Sort by word count descending

          console.log('📈 Top 10 categories by word count:');
          categoriesArray.slice(0, 10).forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name}: ${cat.wordCount} words`);
          });

          // Clear existing categories
          console.log('🗑️  Clearing existing categories...');
          await prisma.puzzleCategory.deleteMany();

          // Insert categories into database
          console.log('💾 Inserting categories into database...');
          
          for (const category of categoriesArray) {
            await prisma.puzzleCategory.create({
              data: {
                name: category.name,
                description: category.description,
                wordCount: category.wordCount,
                favoritesCount: 0,
                isActive: true
              }
            });
          }

          console.log(`✅ Successfully loaded ${categoriesArray.length} categories into database`);
          resolve();
        } catch (error) {
          console.error('❌ Error processing categories:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV file:', error);
        reject(error);
      });
  });
}

async function updateCategoryFavoritesCounts(): Promise<void> {
  console.log('🔄 Updating favorites counts for categories...');
  
  const categories = await prisma.puzzleCategory.findMany();
  
  for (const category of categories) {
    const favoritesCount = await prisma.user.count({
      where: {
        favoriteCategoryId: category.id
      }
    });
    
    await prisma.puzzleCategory.update({
      where: { id: category.id },
      data: { favoritesCount }
    });
  }
  
  console.log('✅ Updated favorites counts for all categories');
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting category loading process...');
    
    await loadCategoriesFromCsv();
    await updateCategoryFavoritesCounts();
    
    // Display final statistics
    const totalCategories = await prisma.puzzleCategory.count();
    const topCategories = await prisma.puzzleCategory.findMany({
      orderBy: { wordCount: 'desc' },
      take: 5,
      select: { name: true, wordCount: true, favoritesCount: true }
    });
    
    console.log('\n📊 Final Statistics:');
    console.log(`Total categories: ${totalCategories}`);
    console.log('Top 5 categories:');
    topCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}: ${cat.wordCount} words, ${cat.favoritesCount} favorites`);
    });
    
    console.log('\n🎉 Category loading completed successfully!');
  } catch (error) {
    console.error('💥 Error in main process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { loadCategoriesFromCsv, updateCategoryFavoritesCounts };