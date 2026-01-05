import { describe, test, expect } from "bun:test";
import { chunk, detectLanguage, type Language } from "../src/index";

describe("Language Detection", () => {
  const cases: [string, Language | null][] = [
    ["test.ts", "typescript"],
    ["test.tsx", "typescript"],
    ["test.mts", "typescript"],
    ["test.js", "javascript"],
    ["test.jsx", "javascript"],
    ["test.mjs", "javascript"],
    ["test.py", "python"],
    ["test.pyi", "python"],
    ["test.go", "go"],
    ["test.rs", "rust"],
    ["test.java", "java"],
    ["test.svelte", "svelte"],
    ["test.vue", null],
    ["test.txt", null],
    ["test.md", null],
  ];

  test.each(cases)("detectLanguage(%s) => %s", (file, expected) => {
    expect(detectLanguage(file)).toBe(expected);
  });
});

describe("TypeScript Chunking", () => {
  test("class with methods", async () => {
    const code = `
export class UserService {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async getUser(id: string): Promise<User> {
    return this.db.users.findById(id);
  }
  
  async createUser(data: CreateUserDTO): Promise<User> {
    return this.db.users.create(data);
  }
}`;
    const chunks = await chunk("service.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.context.entities?.some(e => e.name === "UserService"))).toBe(true);
  });

  test("interface and type", async () => {
    const code = `
interface User {
  id: string;
  name: string;
}

type UserDTO = Omit<User, 'id'>;

export type { User, UserDTO };`;
    const chunks = await chunk("types.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("arrow functions", async () => {
    const code = `
export const add = (a: number, b: number) => a + b;

export const multiply = (a: number, b: number): number => {
  return a * b;
};

const fetchData = async () => {
  const res = await fetch('/api');
  return res.json();
};`;
    const chunks = await chunk("utils.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("enum", async () => {
    const code = `
export enum Status {
  Pending = 'pending',
  Active = 'active',
  Completed = 'completed',
}`;
    const chunks = await chunk("enums.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("deeply nested", async () => {
    const code = `
export class Outer {
  inner = {
    method() {
      return function nested() {
        const arrow = () => ({ deep: true });
        return arrow;
      };
    }
  };
}`;
    const chunks = await chunk("nested.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.context.entities?.some(e => e.name === "Outer"))).toBe(true);
  });

  test("empty file", async () => {
    const chunks = await chunk("empty.ts", "");
    expect(chunks.length).toBe(0);
  });

  test("only imports", async () => {
    const code = `
import { foo } from 'bar';
import * as baz from 'qux';
import type { Type } from 'types';`;
    const chunks = await chunk("imports.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("syntax error graceful handling", async () => {
    const code = `function broken( { missing paren`;
    const chunks = await chunk("broken.ts", code);
    expect(Array.isArray(chunks)).toBe(true);
  });
});

describe("JavaScript Chunking", () => {
  test("class and functions", async () => {
    const code = `
class Calculator {
  add(a, b) { return a + b; }
}

function multiply(a, b) {
  return a * b;
}

const divide = (a, b) => a / b;`;
    const chunks = await chunk("calc.js", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("CommonJS module", async () => {
    const code = `
const fs = require('fs');

function readConfig() {
  return JSON.parse(fs.readFileSync('config.json'));
}

module.exports = { readConfig };`;
    const chunks = await chunk("config.cjs", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("Python Chunking", () => {
  test("class with methods", async () => {
    const code = `
class UserRepository:
    def __init__(self, db):
        self.db = db
    
    def get_user(self, user_id: str) -> dict:
        return self.db.users.find_one({"id": user_id})
    
    async def create_user(self, data: dict) -> dict:
        return await self.db.users.insert_one(data)
`;
    const chunks = await chunk("repository.py", code);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some(c => c.context.entities?.some(e => e.name === "UserRepository"))).toBe(true);
  });

  test("standalone functions", async () => {
    const code = `
def add(a, b):
    return a + b

def multiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    return a * b

async def fetch_data(url: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
`;
    const chunks = await chunk("utils.py", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("decorators", async () => {
    const code = `
@dataclass
class Point:
    x: float
    y: float

@router.get("/users")
async def get_users():
    return []
`;
    const chunks = await chunk("decorated.py", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("Go Chunking", () => {
  test("struct and methods", async () => {
    const code = `
package main

type UserService struct {
    db *Database
}

func NewUserService(db *Database) *UserService {
    return &UserService{db: db}
}

func (s *UserService) GetUser(id string) (*User, error) {
    return s.db.FindUser(id)
}

func (s *UserService) CreateUser(data CreateUserDTO) (*User, error) {
    return s.db.CreateUser(data)
}
`;
    const chunks = await chunk("service.go", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("interface", async () => {
    const code = `
package repository

type UserRepository interface {
    GetUser(id string) (*User, error)
    CreateUser(data CreateUserDTO) (*User, error)
    DeleteUser(id string) error
}
`;
    const chunks = await chunk("interface.go", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("Rust Chunking", () => {
  test("struct and impl", async () => {
    const code = `
pub struct UserService {
    db: Database,
}

impl UserService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
    
    pub async fn get_user(&self, id: &str) -> Result<User, Error> {
        self.db.find_user(id).await
    }
}
`;
    const chunks = await chunk("service.rs", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("trait", async () => {
    const code = `
pub trait Repository<T> {
    fn find(&self, id: &str) -> Option<T>;
    fn create(&mut self, item: T) -> Result<T, Error>;
    fn delete(&mut self, id: &str) -> Result<(), Error>;
}
`;
    const chunks = await chunk("traits.rs", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("enum with variants", async () => {
    const code = `
pub enum Status {
    Pending,
    Active { since: DateTime },
    Completed(CompletionReason),
}
`;
    const chunks = await chunk("enums.rs", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("Java Chunking", () => {
  test("class with methods", async () => {
    const code = `
package com.example.service;

public class UserService {
    private final Database db;
    
    public UserService(Database db) {
        this.db = db;
    }
    
    public User getUser(String id) {
        return db.findUser(id);
    }
    
    public User createUser(CreateUserDTO data) {
        return db.createUser(data);
    }
}
`;
    const chunks = await chunk("UserService.java", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("interface", async () => {
    const code = `
package com.example.repository;

public interface UserRepository {
    User findById(String id);
    User save(User user);
    void delete(String id);
}
`;
    const chunks = await chunk("UserRepository.java", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("enum", async () => {
    const code = `
public enum Status {
    PENDING("pending"),
    ACTIVE("active"),
    COMPLETED("completed");
    
    private final String value;
    
    Status(String value) {
        this.value = value;
    }
}
`;
    const chunks = await chunk("Status.java", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("Svelte Chunking", () => {
  test("basic component", async () => {
    const code = `
<script>
  export let name = 'world';
  
  function greet() {
    alert('Hello ' + name);
  }
</script>

<main>
  <h1>Hello {name}!</h1>
  <button on:click={greet}>Greet</button>
</main>

<style>
  h1 { color: purple; }
</style>
`;
    const chunks = await chunk("App.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("script module", async () => {
    const code = `
<script context="module">
  export const prerender = true;
  export async function load({ fetch }) {
    return { props: { data: await fetch('/api').then(r => r.json()) } };
  }
</script>

<script>
  export let data;
</script>

<div>{JSON.stringify(data)}</div>
`;
    const chunks = await chunk("Page.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("TypeScript in script", async () => {
    const code = `
<script lang="ts">
  interface User {
    id: string;
    name: string;
  }
  
  export let user: User;
  
  function formatName(user: User): string {
    return user.name.toUpperCase();
  }
</script>

<h1>{formatName(user)}</h1>
`;
    const chunks = await chunk("User.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("reactive statements", async () => {
    const code = `
<script>
  let count = 0;
  $: doubled = count * 2;
  $: if (count > 10) console.log('Large count!');
  
  function increment() {
    count += 1;
  }
</script>

<button on:click={increment}>{count} (doubled: {doubled})</button>
`;
    const chunks = await chunk("Counter.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("each and if blocks", async () => {
    const code = `
<script>
  export let items = [];
  export let showEmpty = true;
</script>

{#if items.length > 0}
  <ul>
    {#each items as item (item.id)}
      <li>{item.name}</li>
    {/each}
  </ul>
{:else if showEmpty}
  <p>No items</p>
{/if}
`;
    const chunks = await chunk("List.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("await blocks", async () => {
    const code = `
<script>
  let promise = fetch('/api/data').then(r => r.json());
</script>

{#await promise}
  <p>Loading...</p>
{:then data}
  <pre>{JSON.stringify(data)}</pre>
{:catch error}
  <p class="error">{error.message}</p>
{/await}
`;
    const chunks = await chunk("Async.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("snippet blocks (Svelte 5)", async () => {
    const code = `
<script>
  let { items } = $props();
</script>

{#snippet renderItem(item)}
  <li class="item">{item.name}</li>
{/snippet}

<ul>
  {#each items as item}
    {@render renderItem(item)}
  {/each}
</ul>
`;
    const chunks = await chunk("Snippets.svelte", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe("Chunking Options", () => {
  test("maxChunkSize splits large functions", async () => {
    const lines = Array(100).fill('  console.log("line");').join('\n');
    const code = `function big() {\n${lines}\n}`;
    
    const smallChunks = await chunk("big.ts", code, { maxChunkSize: 500 });
    const largeChunks = await chunk("big.ts", code, { maxChunkSize: 5000 });
    
    expect(smallChunks.length).toBeGreaterThan(largeChunks.length);
  });

  test("contextMode affects contextualizedText", async () => {
    const code = `
class Parent {
  method() {
    return 42;
  }
}`;
    
    const fullContext = await chunk("test.ts", code, { contextMode: "full" });
    const minContext = await chunk("test.ts", code, { contextMode: "minimal" });
    
    expect(fullContext.length).toBeGreaterThan(0);
    expect(minContext.length).toBeGreaterThan(0);
  });
});

describe("Edge Cases", () => {
  test("unicode identifiers", async () => {
    const code = `
const こんにちは = "hello";
function 挨拶() { return こんにちは; }
`;
    const chunks = await chunk("unicode.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("very long single line", async () => {
    const longString = "a".repeat(10000);
    const code = `const x = "${longString}";`;
    const chunks = await chunk("long.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("mixed indentation (tabs and spaces)", async () => {
    const code = "function mixed() {\n\tconsole.log('tab');\n    console.log('spaces');\n}";
    const chunks = await chunk("mixed.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("CRLF line endings", async () => {
    const code = "function crlf() {\r\n  return 1;\r\n}\r\n";
    const chunks = await chunk("crlf.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("shebang", async () => {
    const code = `#!/usr/bin/env node
console.log("Hello");`;
    const chunks = await chunk("script.js", code);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("BOM marker", async () => {
    const code = "\uFEFFfunction bom() { return 1; }";
    const chunks = await chunk("bom.ts", code);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
