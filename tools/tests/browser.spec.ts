import { expect } from 'chai'
import { WebLoader, Browser, createBrowser, splitSections } from '../src';

describe("browser", () => {
  let browser:Browser

  before(async () => {
    browser = await createBrowser()
  })

  after(async () => {
    await browser.close()
  })

  it("loads a javascript page", async () => {
    const url = "https://twitter.com/KevinAFischer/status/1706325125312778407"
    const loader = new WebLoader({ browser, url })
    const { pageContent, metadata } = await loader.load()

    expect(pageContent).to.contain("I illustrated just how we’re going to imbue AI with the indescribable essence of humanity")
    expect(metadata.title).to.equal("Kevin Fischer on X")
    expect(metadata.source).to.equal(url)
  })

  it("loads and splits a really long site", async () => {
    const url = "https://docs.unrealengine.com/5.3/en-US/installing-unreal-engine/"
    const loader = new WebLoader({ browser, url })
    const { pageContent, metadata } = await loader.load()
    const sections = splitSections(pageContent, 500)
    expect(sections).to.exist
    expect(sections).to.have.length.greaterThan(50)
  })

})
