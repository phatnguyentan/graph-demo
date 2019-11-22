const { ApolloServer, gql, SchemaDirectiveVisitor } = require('apollo-server');
const { defaultFieldResolver } = require('graphql');

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String @upper
    author: Author
  }

  type Author {
    name: String
    books: [Book]
  }

  interface Box {
    size: Int
    color: String
  }

  type RedBox implements Box {
    size: Int
    color: String
    weight: Int
  }

  type BlueBox implements Box {
    size: Int
    color: String
    weight: Int
  }

  union Result = Book | Author

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
    authors: [Author]
    boxs: [Box]
    search(contains: String): [Result]
    boxsFragment(color: String): [Box]
  }

  type Mutation {
    addBook(title: String, author: String): Book
  }

  directive @upper on FIELD_DEFINITION | FIELD
  
`;

const books = [
    {
        title: 'Harry Potter and the Chamber of Secrets',
        author: {name: 'J.K. Rowling'},
    },
    {
        title: 'Jurassic Park',
        author: {name: 'Michael Crichton'},
    },
];

const authors = [
  {name: "David"}
];

const boxs = [
  {size: 10, color: "red"},
  {size: 20, color: "blue"}
]

  // Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
    Result: {
      __resolveType(obj, context, info) {
        if(obj.name) return "Author";
        if(obj.title) return "Book";
        return null;
      }
    },

    Box: {
      __resolveType(obj, context, info) {
        if(obj.color == "red") return "RedBox";
        if(obj.color == "blue") return "BlueBox";
        return null;
      }
    },

    Author: {
      books(author) {
        // return filter(books, { author: author.name });
        return books.filter((b) => {return author.name == b.author.name});
      },
      
    },

    Query: {
      books: () => books,
      authors: () => authors,
      boxs: () => boxs,
      search: (root, args, { request }, info) => {
        return [...books, ...authors].filter(item => {
          let query = "";
          if(item.name) {
            query = item.name;
          } else {
            query = item.title;
          }
          if(query.includes(args.contains)) return true;
          return false;
        })
      },
      boxsFragment(root, args, {request}, info) {
        return boxs.filter(b => b.color == args.color);
      }
    },
    
    Mutation: {
        addBook: async (root, args, { request }, info) => {
            books.unshift({title: args.title, author: {name: args.author}});
            return books[0];
          },
    },
  };

class UpperCaseDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = async function (...args) {
      const result = await resolve.apply(this, args);
      if (typeof result === "string") {
        return result.toUpperCase();
      }
      return result;
    };
  }
}
// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ typeDefs, resolvers, schemaDirectives: {
  upper: UpperCaseDirective
} });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});