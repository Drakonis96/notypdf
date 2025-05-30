#!/usr/bin/env node

// Test script to validate Notion API connection
require('dotenv').config();
const axios = require('axios');

const NOTION_API_KEY = process.env.REACT_APP_NOTION_API_KEY;
const NOTION_VERSION = '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

async function testNotionConnection() {
    console.log('🔍 Testing Notion API Connection...\n');
    
    // Check if API key is provided
    if (!NOTION_API_KEY) {
        console.log('❌ No API key found');
        console.log('Please set REACT_APP_NOTION_API_KEY in your .env file');
        return;
    }
    
    // Check API key format
    if (!NOTION_API_KEY.startsWith('secret_')) {
        console.log('❌ Invalid API key format');
        console.log('Notion API keys should start with "secret_"');
        console.log('Current key starts with:', NOTION_API_KEY.substring(0, 10) + '...');
        return;
    }
    
    console.log('✅ API key format looks correct');
    console.log('Key preview:', NOTION_API_KEY.substring(0, 15) + '...\n');
    
    // Test API connection
    try {
        console.log('🔗 Testing API connection...');
        const response = await axios.get(`${NOTION_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Successfully connected to Notion API!');
        console.log('User info:', response.data.results[0]?.name || 'No name found');
        
    } catch (error) {
        console.log('❌ Failed to connect to Notion API');
        
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n💡 This usually means:');
                console.log('1. Invalid API key');
                console.log('2. API key not properly formatted');
                console.log('3. Integration might be disabled');
            }
        } else if (error.request) {
            console.log('❌ No response received (network issue)');
        } else {
            console.log('❌ Request setup error:', error.message);
        }
    }
}

testNotionConnection();
