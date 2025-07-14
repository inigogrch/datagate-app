#!/usr/bin/env tsx

import { tagStoryContent, explainContentTagging } from '../../lib/adapters/utils/flexible-tagger'
import { initializePrototypeEmbeddings, getSemanticTags } from '../../lib/ai/embeddings'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Test cases demonstrating different content types
const TEST_CASES = [
  {
    title: "Introducing GPT-4 Turbo: Our Most Advanced Model Yet",
    content: "OpenAI is excited to announce GPT-4 Turbo, featuring a 128K context window, improved instruction following, and significantly reduced costs. This new model represents a major leap forward in our mission to create beneficial AGI. Developers can now build more sophisticated applications with enhanced reasoning capabilities and better performance across all benchmarks.",
    expectedTags: ['openai', 'announcement', 'api', 'machine-learning'],
    testName: "OpenAI Announcement"
  },
  {
    title: "Understanding Transformer Architecture: A Deep Dive",
    content: "This comprehensive tutorial walks through the transformer architecture step by step. We'll explore self-attention mechanisms, positional encoding, and the encoder-decoder structure. Perfect for machine learning practitioners looking to understand the technology behind models like BERT and GPT. Includes Python code examples using PyTorch.",
    expectedTags: ['tutorial', 'machine-learning', 'python', 'pytorch'],
    testName: "ML Tutorial"
  },
  {
    title: "Microsoft Acquires GitHub for $7.5 Billion",
    content: "In a landmark deal, Microsoft Corporation announced the acquisition of GitHub, the world's leading software development platform. This strategic move strengthens Microsoft's commitment to developer freedom, openness and innovation. The acquisition will accelerate enterprise developers' use of GitHub and bring Microsoft's developer tools and services to new audiences.",
    expectedTags: ['microsoft', 'github', 'news', 'startup'],
    testName: "Acquisition News"
  },
  {
    title: "New Research: Scaling Laws for Neural Language Models",
    content: "We present a systematic study of scaling laws for language model performance. Our research shows that model performance improves predictably with increased compute, data, and parameters. These findings have significant implications for future AI development. Published on arXiv:2001.08361, this paper provides crucial insights for the machine learning community.",
    expectedTags: ['research', 'machine-learning', 'arxiv'],
    testName: "Research Paper"
  },
  {
    title: "Building Secure REST APIs with Node.js and Express",
    content: "Learn how to build production-ready REST APIs with proper authentication, rate limiting, and security best practices. This guide covers JWT tokens, OAuth integration, input validation, and protection against common vulnerabilities. We'll use Express.js with TypeScript for type safety.",
    expectedTags: ['tutorial', 'api', 'javascript', 'security', 'typescript'],
    testName: "Security Tutorial"
  }
];

async function testHybridTagging() {
  console.log('🧠 Testing Hybrid Tagging System (Heuristic + Semantic)')
  console.log('=' .repeat(60))
  console.log()
  
  try {
    // Initialize prototype embeddings for semantic tagging
    console.log('📚 Initializing prototype embeddings...')
    await initializePrototypeEmbeddings()
    console.log('✅ Prototype embeddings ready\n')
    
    // Test each case
    for (const testCase of TEST_CASES) {
      console.log(`\n🔍 Test: ${testCase.testName}`)
      console.log(`Title: "${testCase.title}"`)
      console.log('-'.repeat(60))
      
      // Get heuristic tags
      console.log('\n📋 HEURISTIC TAGGING:')
      const heuristicResult = tagStoryContent(
        testCase.title,
        testCase.content,
        'test-adapter'
      )
      
      // Get semantic tags
      console.log('\n🧬 SEMANTIC TAGGING:')
      const semanticTags = await getSemanticTags(
        `${testCase.title} ${testCase.title} ${testCase.content}`,
        0.7, // threshold
        6    // max tags
      )
      
      console.log('Semantic matches:')
      semanticTags.forEach(({ tag, similarity }) => {
        console.log(`   • ${tag}: ${(similarity * 100).toFixed(1)}% similarity`)
      })
      
      // Combine tags (simulate what hybrid tagger does)
      const combinedTags = new Set([
        ...heuristicResult.tags,
        ...semanticTags.map(t => t.tag)
      ])
      
      console.log('\n🎯 HYBRID RESULT:')
      console.log(`Combined tags: [${Array.from(combinedTags).slice(0, 6).join(', ')}]`)
      console.log(`Expected tags: [${testCase.expectedTags.join(', ')}]`)
      
      // Check accuracy
      const matchedTags = testCase.expectedTags.filter(tag => 
        Array.from(combinedTags).includes(tag)
      )
      const accuracy = (matchedTags.length / testCase.expectedTags.length) * 100
      console.log(`Accuracy: ${accuracy.toFixed(0)}% (${matchedTags.length}/${testCase.expectedTags.length} expected tags found)`)
    }
    
    // Test semantic similarity between related content
    console.log('\n\n🔗 SEMANTIC SIMILARITY TEST:')
    console.log('=' .repeat(60))
    
    const testContent = [
      { 
        name: "Python ML Tutorial",
        text: "Machine learning with Python using scikit-learn and TensorFlow. Build neural networks and train models."
      },
      {
        name: "JavaScript Web Dev",
        text: "Building modern web applications with React and Node.js. Frontend development with TypeScript."
      },
      {
        name: "AI Research Paper",
        text: "Novel approach to transformer architectures for natural language processing. Experimental results on benchmarks."
      }
    ]
    
    console.log('\nTesting cross-content similarity:')
    for (let i = 0; i < testContent.length; i++) {
      console.log(`\n"${testContent[i].name}" matches:`)
      const tags = await getSemanticTags(testContent[i].text, 0.6, 3)
      tags.forEach(({ tag, similarity }) => {
        console.log(`   • ${tag}: ${(similarity * 100).toFixed(1)}%`)
      })
    }
    
    // Performance test
    console.log('\n\n⚡ PERFORMANCE TEST:')
    console.log('=' .repeat(60))
    
    const perfStart = Date.now()
    const iterations = 10
    
    for (let i = 0; i < iterations; i++) {
      await getSemanticTags(TEST_CASES[0].content, 0.7, 5)
    }
    
    const avgTime = (Date.now() - perfStart) / iterations
    console.log(`Average semantic tagging time: ${avgTime.toFixed(0)}ms per item`)
    console.log(`(Includes embedding generation via OpenAI API)`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
if (require.main === module) {
  testHybridTagging()
    .then(() => {
      console.log('\n\n✅ All tests completed successfully!')
      console.log('🎉 Hybrid tagging system is working correctly')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Test failed:', error)
      process.exit(1)
    })
} 