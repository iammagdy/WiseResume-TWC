#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { Client, Databases, Query } = require('node-appwrite');
function loadEnv(f){const p=path.join(process.cwd(),f);if(!fs.existsSync(p))return;for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith('#')||!t.includes('='))continue;const [k,...r]=t.split('=');if(!process.env[k])process.env[k]=r.join('=').replace(/^["']|["']$/g,'');}}
loadEnv('.env.deploy');
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const db = new Databases(new Client().setEndpoint(endpoint).setProject(projectId).setKey(process.env.APPWRITE_API_KEY));
db.listDocuments('main','bug_reports',[Query.limit(2)]).then(r=>{
  console.log(JSON.stringify(r.documents,null,2));
}).catch(e=>console.error(e.message));
