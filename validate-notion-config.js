#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

const NOTION_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function validateNotionConfig() {
  console.log('🔍 Validating Notion Configuration...\n');
  
  // Check API Key
  const apiKey = process.env.REACT_APP_NOTION_API_KEY || process.env.NOTION_API_KEY;
  
  console.log('1. API Key Validation:');
  if (!apiKey) {
    console.log('   ❌ No API key found in REACT_APP_NOTION_API_KEY or NOTION_API_KEY');
    console.log('   💡 Set your API key in the .env file');
    return false;
  }
  
  if (!apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_')) {
    console.log('   ❌ Invalid API key format');
    console.log('   💡 Notion API keys should start with "secret_" or "ntn_"');
    console.log('   💡 Get your API key from https://www.notion.so/my-integrations');
    console.log(`   💡 Current key starts with: ${apiKey.substring(0, 10)}...`);
    return false;
  }
  
  console.log('   ✅ API key format is correct');
  
  // Test API connection
  console.log('\n2. API Connection Test:');
  try {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    };
    
    const response = await axios.get(`${NOTION_BASE_URL}/users`, { headers });
    console.log('   ✅ Successfully connected to Notion API');
    console.log(`   📊 Found ${response.data.results?.length || 0} users in workspace`);
    
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ❌ Authentication failed - Invalid API key');
    } else if (error.response?.status === 403) {
      console.log('   ❌ Access forbidden - Check integration permissions');
    } else {
      console.log(`   ❌ Connection failed: ${error.message}`);
    }
    return false;
  }
}

async function testDatabase(databaseId) {
  if (!databaseId) {
    console.log('\n3. Database Test: Skipped (no database ID provided)');
    return;
  }
  
  console.log('\n3. Database Access Test:');
  
  if (databaseId.length !== 32) {
    console.log('   ❌ Invalid database ID length');
    console.log('   💡 Database ID should be 32 characters long');
    return;
  }
  
  const apiKey = process.env.REACT_APP_NOTION_API_KEY || process.env.NOTION_API_KEY;
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.get(`${NOTION_BASE_URL}/databases/${databaseId}`, { headers });
    console.log('   ✅ Successfully accessed database');
    console.log(`   📋 Database title: ${response.data.title?.[0]?.plain_text || 'Untitled'}`);
    
    const properties = Object.keys(response.data.properties);
    console.log(`   📝 Available properties: ${properties.join(', ')}`);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ❌ Database not found');
      console.log('   💡 Check your database ID and ensure the integration has access');
    } else if (error.response?.status === 403) {
      console.log('   ❌ Access denied to database');
      console.log('   💡 Share the database with your integration in Notion');
    } else {
      console.log(`   ❌ Database access failed: ${error.message}`);
    }
  }
}

// Main execution
(async () => {
  const isValid = await validateNotionConfig();
  
  if (isValid && process.argv[2]) {
    await testDatabase(process.argv[2]);
  }
  
  if (!isValid) {
    console.log('\n🚨 Configuration issues found. Please fix them before proceeding.');
    process.exit(1);
  } else {
    console.log('\n✅ Notion configuration looks good!');
  }
})();
