import Head from 'next/head'
const Cosmic = require('cosmicjs')
//import Cosmic from 'cosmicjs'
const api = Cosmic()
// Set these values, found in Bucket > Settings after logging in at https://app.cosmicjs.com/login
const bucket = api.bucket({
  slug: 'simple-blog-aperture-ai-production',
  read_key: 'IQXMa5JIcrIkfwA8C9yTChWeU7XLVPv2hpoPI69gE0YSB8ANU0'
})
function Blog({ posts }) {
  return (
    <div className="container">
      <Head>
        <title>Cosmic App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {posts.map((post) => (
        <div key={post.slug}>
          <h3>{post.title}</h3>
          <img alt="" src={`${post.metadata.hero.imgix_url}?w=400`}/>
        </div>
      ))}
    </div>
  )
}
export async function getStaticProps() {
  const data = await bucket.getObjects({
    type: 'posts',
    props: 'slug,title,content,metadata' // Limit the API response data by props
  })
  const posts = await data.objects
  return {
    props: {
      posts,
    }
  }
}
export default Blog