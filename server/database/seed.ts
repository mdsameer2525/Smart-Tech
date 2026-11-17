import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';

interface SeedQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

interface SeedConcept {
  key: string;
  title: string;
  description: string;
  lesson_content: string;
  video_url: string;
  estimated_duration: number;
  threshold: number;
  questions: SeedQuestion[];
}

const PROGRAMMING_CONCEPTS: SeedConcept[] = [
  {
    key: 'intro',
    title: 'Introduction to Programming',
    description: 'Understand how computers execute instructions, algorithms, and source code.',
    lesson_content: `Programming is the craft of translating human problem-solving steps into precise instructions a computer can execute reliably.

Key Foundations:
1. Input, Processing, and Output: Every program accepts input data, applies deterministic logic, and produces output.
2. Source Code vs. Machine Execution: High-level languages like Python, JavaScript, and C++ allow engineers to express logic clearly before compilers or interpreters translate it into machine operations.
3. Sequential Flow: By default, instructions execute one line after another from top to bottom unless control flow alters the path.

Why Prerequisites Matter Here:
Before storing values in memory or repeating tasks, you need a mental model of step-by-step execution and debugging.`,
    video_url: 'https://www.youtube.com/watch?v=zOjov-2OZ0E',
    estimated_duration: 15,
    threshold: 70,
    questions: [
      {
        question: 'What is the primary role of a computer program?',
        options: [
          'To provide a step-by-step set of instructions for a computer to execute',
          'To manufacture physical hardware components',
          'To replace electricity inside the CPU',
          'To store only images and audio files',
        ],
        correct_answer: 0,
        explanation: 'A program is a deterministic sequence of instructions that tells a computer how to process inputs into outputs.',
      },
      {
        question: 'In sequential execution, how are statements processed by default?',
        options: [
          'In random order based on file size',
          'One statement after another from top to bottom',
          'Always from the bottom line upward',
          'Only when the user clicks every line manually',
        ],
        correct_answer: 1,
        explanation: 'Unless redirected by conditionals, loops, or function calls, execution flows top-to-bottom.',
      },
      {
        question: 'Which component translates human-readable source code into machine-executable form?',
        options: [
          'A monitor cable',
          'A compiler or interpreter',
          'A keyboard driver',
          'A power supply unit',
        ],
        correct_answer: 1,
        explanation: 'Compilers and interpreters bridge high-level human-readable syntax and machine instructions.',
      },
    ],
  },
  {
    key: 'variables',
    title: 'Variables',
    description: 'Store, label, and update values in memory using named identifiers.',
    lesson_content: `A variable is a named container in memory that holds a value which can be read and updated as a program runs.

Core Concepts:
1. Declaration & Assignment: Creating a variable binds a symbolic name (such as totalScore) to a value (such as 0).
2. Mutability & Reassignment: Updating totalScore = totalScore + 10 replaces the stored value while keeping the same name.
3. Naming Conventions: Clear, descriptive identifiers (camelCase or snake_case) make code self-documenting and prevent bugs.

Example:
let price = 49;
let quantity = 3;
let total = price * quantity; // 147`,
    video_url: 'https://www.youtube.com/watch?v=ghCbYYZfdRc',
    estimated_duration: 20,
    threshold: 70,
    questions: [
      {
        question: 'What does a variable represent in a program?',
        options: [
          'A permanent hardware chip on the motherboard',
          'A named reference to a value stored in memory',
          'An external website URL',
          'A syntax error in source code',
        ],
        correct_answer: 1,
        explanation: 'Variables associate human-readable names with memory locations storing data.',
      },
      {
        question: 'If x = 5 and then x = x + 3 runs, what is the value of x?',
        options: ['3', '5', '8', '53'],
        correct_answer: 2,
        explanation: 'The right-hand side evaluates 5 + 3 = 8, then reassigns 8 back to x.',
      },
      {
        question: 'Which variable name best follows clean readability practices for storing a student count?',
        options: ['a1', 'studentCount', 'x', 'temp_123_var'],
        correct_answer: 1,
        explanation: 'Descriptive names like studentCount communicate intent clearly.',
      },
    ],
  },
  {
    key: 'data_types',
    title: 'Data Types',
    description: 'Differentiate integers, floating-point numbers, booleans, and text strings.',
    lesson_content: `Every value in a program belongs to a data type that determines what operations are valid and how memory is interpreted.

Essential Primitive Types:
1. Numbers (Integers & Floats): Integers represent whole counts (42), while floating-point numbers represent decimals (3.14).
2. Strings: Sequences of characters enclosed in quotes ("Smart-Tech").
3. Booleans: Logical truth values — strictly true or false — used to drive decisions.
4. Type Safety: Adding 2 + 2 yields 4, whereas concatenating "2" + "2" yields "22". Understanding types prevents subtle logic bugs.`,
    video_url: 'https://www.youtube.com/watch?v=cDA3_5982h8',
    estimated_duration: 20,
    threshold: 70,
    questions: [
      {
        question: 'Which data type represents only true or false values?',
        options: ['Integer', 'String', 'Boolean', 'Float'],
        correct_answer: 2,
        explanation: 'Booleans represent binary truth values: true or false.',
      },
      {
        question: 'What is the typical result of concatenating the string "10" with "5"?',
        options: ['15', '"105"', '50', '5'],
        correct_answer: 1,
        explanation: 'String concatenation joins character sequences side by side into "105".',
      },
      {
        question: 'Which value is best stored as a floating-point number?',
        options: ['Number of enrolled learners', 'Account verification status', 'Average quiz percentage (87.5)', 'User display name'],
        correct_answer: 2,
        explanation: 'Fractional values like 87.5 require floating-point representation.',
      },
    ],
  },
  {
    key: 'operators',
    title: 'Operators',
    description: 'Combine values using arithmetic, comparison, and logical operators.',
    lesson_content: `Operators are symbols that perform computations, comparisons, and boolean combinations on values and variables.

Three Families of Operators:
1. Arithmetic Operators: +, -, *, /, and modulo (%) for remainders.
2. Comparison Operators: === (equal), !== (not equal), >, <, >=, <= — these always evaluate to a Boolean.
3. Logical Operators: AND (&&), OR (||), and NOT (!) combine multiple conditions into a single decision.

Example:
isEligible = score >= 70 && hasSubmitted === true`,
    video_url: 'https://www.youtube.com/watch?v=FZ4z5b6O2xQ',
    estimated_duration: 20,
    threshold: 70,
    questions: [
      {
        question: 'What does the modulo operator (10 % 3) compute?',
        options: ['3.33', '1 (the remainder after division)', '30', '7'],
        correct_answer: 1,
        explanation: '10 divided by 3 equals 3 with a remainder of 1.',
      },
      {
        question: 'What is the result of (true && false)?',
        options: ['true', 'false', 'null', '1'],
        correct_answer: 1,
        explanation: 'Logical AND returns true only when both operands are true.',
      },
      {
        question: 'Which operator checks whether a score meets or exceeds 70?',
        options: ['score = 70', 'score >= 70', 'score != 70', 'score + 70'],
        correct_answer: 1,
        explanation: 'The >= comparison operator tests greater-than-or-equal-to.',
      },
    ],
  },
  {
    key: 'conditionals',
    title: 'Conditional Statements',
    description: 'Branch execution paths dynamically using if, else-if, and else blocks.',
    lesson_content: `Conditional statements allow programs to make decisions and take different execution branches depending on runtime data.

Structure of a Branch:
- if (condition): Executes only when the boolean condition evaluates to true.
- else if (condition): Evaluates an alternative condition if previous branches were false.
- else: Fallback branch executed when no prior condition matched.

Real-World Example (Mastery Evaluation):
if (score >= threshold) {
  status = "Mastered";
} else {
  status = "Retry Needed";
}`,
    video_url: 'https://www.youtube.com/watch?v=f4ZQ2f0z9C8',
    estimated_duration: 25,
    threshold: 70,
    questions: [
      {
        question: 'When does an else block execute?',
        options: [
          'Always, regardless of previous conditions',
          'Only when all preceding if and else-if conditions evaluate to false',
          'Before the first if condition is checked',
          'Only inside arithmetic expressions',
        ],
        correct_answer: 1,
        explanation: 'The else branch serves as the default fallback when earlier conditions are false.',
      },
      {
        question: 'Given threshold = 70 and score = 85, what happens in: if (score >= threshold) { pass() } else { fail() }?',
        options: ['fail() runs', 'pass() runs', 'Both pass() and fail() run', 'Neither runs'],
        correct_answer: 1,
        explanation: 'Since 85 >= 70 is true, the first matching branch pass() executes.',
      },
      {
        question: 'What type of value must a conditional expression evaluate to?',
        options: ['A Boolean (true or false)', 'A video URL', 'A floating-point array', 'A comment block'],
        correct_answer: 0,
        explanation: 'Branching conditions evaluate to true or false.',
      },
    ],
  },
  {
    key: 'loops',
    title: 'Loops',
    description: 'Repeat blocks of instructions cleanly using for and while iteration.',
    lesson_content: `Loops automate repetition so a program can process collections, count sequences, or retry until a condition is met.

Loop Patterns:
1. for loop: Ideal when the number of iterations is known (for i = 0 to n - 1).
2. while loop: Ideal when repetition continues until a dynamic condition becomes false.
3. Loop Invariants & Termination: Every loop must progress toward a stopping condition; otherwise an infinite loop occurs.

Example:
let sum = 0;
for (let i = 1; i <= 5; i++) {
  sum += i;
}
// sum becomes 15`,
    video_url: 'https://www.youtube.com/watch?v=wxds6MAtUQ0',
    estimated_duration: 30,
    threshold: 70,
    questions: [
      {
        question: 'What causes an infinite loop?',
        options: [
          'Using a loop inside a function',
          'A loop condition that never becomes false',
          'Using a variable named i',
          'Repeating a loop 10 times',
        ],
        correct_answer: 1,
        explanation: 'If the termination condition never turns false, the loop repeats indefinitely.',
      },
      {
        question: 'How many times does a loop run for i = 0; i < 4; i++?',
        options: ['3 times', '4 times', '5 times', '0 times'],
        correct_answer: 1,
        explanation: 'It runs for i = 0, 1, 2, and 3 — four iterations total.',
      },
      {
        question: 'Which loop construct is best when you do not know upfront how many attempts a user will take?',
        options: ['while loop', 'Single if statement', 'Variable declaration', 'Constant assignment'],
        correct_answer: 0,
        explanation: 'A while loop continues as long as a condition holds, ideal for unknown iteration counts.',
      },
    ],
  },
  {
    key: 'functions',
    title: 'Functions',
    description: 'Encapsulate reusable logic into modular, named procedures.',
    lesson_content: `Functions package a block of logic under a single reusable name, eliminating duplication and making complex software modular.

Why Functions Matter:
1. Abstraction: Callers only need to know what a function does, not every internal line.
2. Reusability: Write validation or scoring logic once and invoke it across multiple modules.
3. Separation of Concerns: Breaking a large problem into focused functions simplifies testing and debugging.

Example:
function greetLearner(name) {
  return "Welcome, " + name;
}`,
    video_url: 'https://www.youtube.com/watch?v=N8ap4k_1QEQ',
    estimated_duration: 30,
    threshold: 70,
    questions: [
      {
        question: 'What is the primary benefit of organizing code into functions?',
        options: [
          'It disables variable storage',
          'It enables modularity, reuse, and clearer abstraction',
          'It removes the need for data types',
          'It doubles CPU clock speed automatically',
        ],
        correct_answer: 1,
        explanation: 'Functions encapsulate reusable tasks and break complex programs into understandable units.',
      },
      {
        question: 'When does the code inside a function definition execute?',
        options: [
          'Only when the function is called/invoked',
          'Never',
          'Only during comments',
          'Automatically before the file is saved',
        ],
        correct_answer: 0,
        explanation: 'Defining a function registers it; invoking it runs its body.',
      },
      {
        question: 'What is a pure function?',
        options: [
          'A function that takes no inputs and crashes',
          'A function whose output depends only on its inputs with no side effects',
          'A function containing only loops',
          'A function written without parentheses',
        ],
        correct_answer: 1,
        explanation: 'Pure functions produce deterministic outputs from their arguments without mutating external state.',
      },
    ],
  },
  {
    key: 'function_params',
    title: 'Function Parameters',
    description: 'Pass dynamic inputs and default values into functions cleanly.',
    lesson_content: `Parameters allow a single function to behave flexibly by accepting different inputs on each call.

Parameters vs. Arguments:
- Parameters are the named placeholders in the function signature: function calculateScore(correct, total).
- Arguments are the concrete values supplied at call time: calculateScore(8, 10).
- Default Parameters provide sensible fallbacks when an optional argument is omitted.`,
    video_url: 'https://www.youtube.com/watch?v=9Os0o3wzS_I',
    estimated_duration: 20,
    threshold: 70,
    questions: [
      {
        question: 'What is the difference between a parameter and an argument?',
        options: [
          'A parameter is the variable in the function definition; an argument is the actual value passed at call time',
          'Parameters are only numbers; arguments are only strings',
          'They are syntax errors',
          'Arguments can never be variables',
        ],
        correct_answer: 0,
        explanation: 'Parameters define the function interface; arguments supply concrete values when called.',
      },
      {
        question: 'What do default parameters provide?',
        options: [
          'Automatic encryption',
          'Fallback values when callers omit optional arguments',
          'Infinite loops',
          'Database tables',
        ],
        correct_answer: 1,
        explanation: 'Default parameters prevent undefined inputs when optional arguments are omitted.',
      },
      {
        question: 'In function add(a, b) called as add(4, 9), what is b?',
        options: ['4', '9', '13', 'undefined'],
        correct_answer: 1,
        explanation: 'Positional arguments bind in order: a = 4, b = 9.',
      },
    ],
  },
  {
    key: 'return_values',
    title: 'Return Values',
    description: 'Send computed outputs back to callers and compose function pipelines.',
    lesson_content: `A return statement hands a computed result back to whatever code invoked the function and immediately exits the function body.

Key Patterns:
1. Composing Functions: Returning values lets you feed the output of one function directly into another.
2. Early Returns: Guard clauses can return early on invalid input, keeping logic flat and readable.
3. Void vs. Value-Returning: Functions without an explicit return produce undefined/void rather than a reusable value.`,
    video_url: 'https://www.youtube.com/watch?v=kV2yX6T_2vQ',
    estimated_duration: 20,
    threshold: 70,
    questions: [
      {
        question: 'What happens immediately after a return statement executes inside a function?',
        options: [
          'The function exits and passes the returned value back to the caller',
          'The loop restarts from zero',
          'The program terminates completely',
          'The value is printed only to a printer',
        ],
        correct_answer: 0,
        explanation: 'return immediately concludes the function execution and delivers the result to the call site.',
      },
      {
        question: 'Why is returning a value often better than just printing inside a helper function?',
        options: [
          'Returned values can be stored, tested, and passed to other functions',
          'Printed text runs faster than arithmetic',
          'Return statements work without functions',
          'Printing deletes variables',
        ],
        correct_answer: 0,
        explanation: 'Returning values makes functions composable and easy to unit-test.',
      },
      {
        question: 'What is a guard clause (early return)?',
        options: [
          'Returning immediately at the top of a function when preconditions fail',
          'Adding a second main function',
          'Running a function twice',
          'Ignoring all parameters',
        ],
        correct_answer: 0,
        explanation: 'Early returns handle edge cases cleanly without deep nesting.',
      },
    ],
  },
  {
    key: 'arrays',
    title: 'Arrays',
    description: 'Store ordered collections and traverse elements efficiently by index.',
    lesson_content: `An array stores an ordered sequence of elements under one variable name, accessible in constant time using a zero-based index.

Key Operations:
1. Zero-Based Indexing: In items = [10, 20, 30], items[0] is 10 and items[2] is 30.
2. Iteration: Loops traverse arrays cleanly to compute totals, filter items, or find maxima.
3. Dynamic Sizing: Modern arrays support push, pop, slice, and map operations.`,
    video_url: 'https://www.youtube.com/watch?v=55l-aZ7_F24',
    estimated_duration: 30,
    threshold: 70,
    questions: [
      {
        question: 'In a zero-indexed array arr = ["A", "B", "C", "D"], what is arr[2]?',
        options: ['"A"', '"B"', '"C"', '"D"'],
        correct_answer: 2,
        explanation: 'Index 0 is "A", index 1 is "B", index 2 is "C".',
      },
      {
        question: 'What is the time complexity of reading an array element when you already know its index?',
        options: ['O(1) constant time', 'O(n^2)', 'O(2^n)', 'O(n log n)'],
        correct_answer: 0,
        explanation: 'Contiguous indexed memory allows direct O(1) lookup by index offset.',
      },
      {
        question: 'Which construct is commonly paired with arrays to inspect every item?',
        options: ['A loop', 'A comment', 'A boolean literal', 'A syntax error'],
        correct_answer: 0,
        explanation: 'Loops iterate over array indices from 0 to length - 1.',
      },
    ],
  },
  {
    key: 'strings',
    title: 'Strings',
    description: 'Manipulate character sequences, slicing, searching, and formatting.',
    lesson_content: `Strings are ordered sequences of characters used to represent text, identifiers, and structured messages.

Essential String Operations:
1. Indexing & Length: Like arrays, characters sit at positions 0 through length - 1.
2. Slicing & Substrings: Extract prefixes, suffixes, or tokens cleanly.
3. Searching & Splitting: Parse CSV lines, validate emails, and format user-facing output.`,
    video_url: 'https://www.youtube.com/watch?v=k9TUPpGqYTo',
    estimated_duration: 25,
    threshold: 70,
    questions: [
      {
        question: 'How is a string structurally similar to an array?',
        options: [
          'It is an ordered sequence of characters accessible by index',
          'It can only hold integers',
          'It has no length property',
          'It cannot be traversed with a loop',
        ],
        correct_answer: 0,
        explanation: 'Strings represent indexed sequences of characters.',
      },
      {
        question: 'What does splitting "Variables,Loops,Functions" on "," produce?',
        options: [
          'An array of 3 strings: ["Variables", "Loops", "Functions"]',
          'A single integer 3',
          'A boolean false',
          'An empty string',
        ],
        correct_answer: 0,
        explanation: 'Splitting by delimiter breaks text into an array of substrings.',
      },
      {
        question: 'In many languages (JavaScript, Python, Java), strings are immutable. What does that mean?',
        options: [
          'Operations create a new string rather than modifying characters in place',
          'Strings can never be printed',
          'Strings cannot be compared',
          'Strings are deleted after 1 second',
        ],
        correct_answer: 0,
        explanation: 'Immutable strings cannot have individual characters mutated in place; transformations return new strings.',
      },
    ],
  },
  {
    key: 'recursion',
    title: 'Recursion',
    description: 'Solve self-similar problems using base cases and recursive decomposition.',
    lesson_content: `Recursion occurs when a function solves a problem by calling itself on smaller subproblems until reaching a base case.

The Two Mandatory Rules of Recursion:
1. Base Case: A stopping condition that returns directly without further recursive calls.
2. Recursive Step: Moves strictly closer to the base case on every call.

Why Functions + Loops Are Prerequisites:
Understanding call stacks (from Functions) and repetition invariants (from Loops) makes recursive tree and graph traversal natural — including our DAG cycle detection algorithm!`,
    video_url: 'https://www.youtube.com/watch?v=IJDJ0kBx2LM',
    estimated_duration: 35,
    threshold: 70,
    questions: [
      {
        question: 'What happens if a recursive function lacks a reachable base case?',
        options: [
          'It triggers infinite recursion and eventually a stack overflow error',
          'It automatically converts into an array',
          'It returns 0 immediately',
          'It skips execution',
        ],
        correct_answer: 0,
        explanation: 'Without a base case, call frames accumulate until the call stack overflows.',
      },
      {
        question: 'Which graph algorithm naturally relies on recursion or an explicit stack?',
        options: ['Depth-First Search (DFS)', 'Variable assignment', 'String concatenation', 'Integer addition'],
        correct_answer: 0,
        explanation: 'DFS explores a branch deeply via recursive calls before backtracking.',
      },
      {
        question: 'In factorial(n) = n * factorial(n - 1), what is the standard base case?',
        options: ['n <= 1 returns 1', 'n === 100 returns 0', 'n > 0 calls factorial(n + 1)', 'No base case is needed'],
        correct_answer: 0,
        explanation: 'When n reaches 1 (or 0), factorial returns 1 to terminate recursion.',
      },
    ],
  },
  {
    key: 'pointers',
    title: 'Pointers',
    description: 'Understand memory addresses, references, and indirect data access.',
    lesson_content: `A pointer (or reference) stores the memory address of another value rather than copying the value itself.

Core Concepts:
1. Memory Addresses: Every variable occupies bytes in RAM at a specific address.
2. Reference vs. Copy: Passing a reference allows a function or data structure to link directly to existing nodes without duplicating large objects.
3. Null / Safety Checks: Always verify a pointer/reference is non-null before dereferencing it to construct linked lists and trees safely.`,
    video_url: 'https://www.youtube.com/watch?v=zuegQmMdy8M',
    estimated_duration: 30,
    threshold: 70,
    questions: [
      {
        question: 'What value does a pointer hold?',
        options: [
          'The memory address of another variable or object',
          'Only a boolean true/false',
          'A CSS color code',
          'An audio waveform',
        ],
        correct_answer: 0,
        explanation: 'Pointers store memory addresses pointing to data locations.',
      },
      {
        question: 'Why are references/pointers essential for linked data structures?',
        options: [
          'They let nodes connect dynamically to next/child nodes in memory',
          'They prevent all loops from running',
          'They replace CPUs',
          'They force all data to be strings',
        ],
        correct_answer: 0,
        explanation: 'Nodes in linked lists, trees, and graphs link together via references/pointers.',
      },
      {
        question: 'What risk occurs when dereferencing a null pointer?',
        options: [
          'A runtime crash or null reference exception',
          'Automatic sorting',
          'Faster compilation',
          'Memory compression',
        ],
        correct_answer: 0,
        explanation: 'Dereferencing null attempts to access an invalid memory address.',
      },
    ],
  },
  {
    key: 'data_structures',
    title: 'Data Structures',
    description: 'Organize information using Stacks, Queues, Linked Lists, Trees, and Graphs.',
    lesson_content: `Data structures organize data systematically so lookups, insertions, and traversals match the problem requirements.

Essential Structures:
1. Stack (LIFO): Last-In, First-Out — powers function call stacks and DFS.
2. Queue (FIFO): First-In, First-Out — powers BFS and Kahn's topological sort!
3. Directed Acyclic Graph (DAG): Nodes connected by one-way edges without cycles — the exact model powering Smart-Tech prerequisite maps.`,
    video_url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
    estimated_duration: 45,
    threshold: 70,
    questions: [
      {
        question: 'Which data structure follows First-In, First-Out (FIFO) ordering?',
        options: ['Queue', 'Stack', 'Binary Search Tree', 'Hash collision'],
        correct_answer: 0,
        explanation: 'Queues process items in the order they arrived (FIFO).',
      },
      {
        question: 'What defines a Directed Acyclic Graph (DAG)?',
        options: [
          'Directed edges with zero cycles',
          'Undirected edges forming a single ring',
          'A flat list with no edges',
          'A tree where every node has 100 parents',
        ],
        correct_answer: 0,
        explanation: 'A DAG has directed relationships and strictly forbids circular dependency cycles.',
      },
      {
        question: 'Which data structure does Depth-First Search use implicitly via recursion?',
        options: ['Stack (LIFO)', 'Queue (FIFO)', 'Circular buffer', 'Spreadsheet'],
        correct_answer: 0,
        explanation: 'The call stack stores active recursive frames in Last-In, First-Out order.',
      },
    ],
  },
  {
    key: 'algorithms',
    title: 'Algorithms',
    description: 'Design efficient sorting, searching, shortest-path, and topological algorithms.',
    lesson_content: `An algorithm is a well-defined, finite computational procedure that transforms inputs into outputs efficiently.

Key Algorithmic Paradigms:
1. Complexity Analysis (Big-O): Measure how runtime and memory scale with input size N.
2. Graph Traversal (BFS & DFS): Discover prerequisite ancestors, detect cycles, and compute reachability.
3. Topological Sorting: Order concepts in a DAG so every prerequisite appears before its dependent concepts — enabling personalized learning paths!`,
    video_url: 'https://www.youtube.com/watch?v=8hly31xKli0',
    estimated_duration: 50,
    threshold: 70,
    questions: [
      {
        question: 'What does topological sorting guarantee for a Directed Acyclic Graph?',
        options: [
          'Every prerequisite node appears before any node that depends on it',
          'All nodes are sorted alphabetically regardless of edges',
          'Cycles are added automatically',
          'Half of the nodes are deleted',
        ],
        correct_answer: 0,
        explanation: 'Topological ordering respects all directed dependency edges.',
      },
      {
        question: 'Why must cycle detection run before computing a topological order?',
        options: [
          'A graph containing a cycle has no valid topological ordering',
          'Cycle detection changes font sizes',
          'Topological sorting only works on integers',
          'Cycles speed up BFS',
        ],
        correct_answer: 0,
        explanation: 'Circular dependencies create mutual deadlocks where no valid prerequisite-first order exists.',
      },
      {
        question: 'Which algorithm is best suited for finding all required prerequisite ancestors of a target concept?',
        options: [
          'Reverse-edge BFS/DFS traversal from the target node',
          'Random node sampling',
          'Bubble sort',
          'Linear string splitting',
        ],
        correct_answer: 0,
        explanation: 'Traversing reverse prerequisite edges via BFS/DFS discovers every direct and transitive prerequisite.',
      },
    ],
  },
];

const PROGRAMMING_EDGES: Array<[string, string]> = [
  ['intro', 'variables'],
  ['intro', 'conditionals'],
  ['intro', 'loops'],
  ['variables', 'data_types'],
  ['variables', 'operators'],
  ['operators', 'conditionals'],
  ['conditionals', 'loops'],
  ['variables', 'functions'],
  ['data_types', 'functions'],
  ['functions', 'function_params'],
  ['functions', 'return_values'],
  ['variables', 'arrays'],
  ['loops', 'arrays'],
  ['variables', 'strings'],
  ['arrays', 'strings'],
  ['functions', 'recursion'],
  ['loops', 'recursion'],
  ['variables', 'pointers'],
  ['data_types', 'pointers'],
  ['arrays', 'data_structures'],
  ['pointers', 'data_structures'],
  ['functions', 'algorithms'],
  ['data_structures', 'algorithms'],
];

export function seedDatabaseIfEmpty(db: Database.Database): void {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) {
    return;
  }

  const passwordHash = bcrypt.hashSync('demo123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?)'
  );

  const instructorRes = insertUser.run(
    'Dr. Ananya Rao',
    'instructor@smarttech.edu',
    passwordHash,
    'instructor',
    'en'
  );
  const instructorId = Number(instructorRes.lastInsertRowid);

  const aaravRes = insertUser.run(
    'Aarav Sharma',
    'aarav@smarttech.edu',
    passwordHash,
    'learner',
    'en'
  );
  const aaravId = Number(aaravRes.lastInsertRowid);

  const priyaRes = insertUser.run(
    'Priya Nair',
    'priya@smarttech.edu',
    passwordHash,
    'learner',
    'kn'
  );
  const priyaId = Number(priyaRes.lastInsertRowid);

  const rohanRes = insertUser.run(
    'Rohan Kulkarni',
    'rohan@smarttech.edu',
    passwordHash,
    'learner',
    'hi'
  );
  const rohanId = Number(rohanRes.lastInsertRowid);

  // Course 1: 15-Concept Core Programming Course
  const insertCourse = db.prepare(
    'INSERT INTO courses (instructor_id, title, description, category, status) VALUES (?, ?, ?, ?, ?)'
  );

  const course1Res = insertCourse.run(
    instructorId,
    'Programming Fundamentals to Advanced Concepts',
    'Master software engineering from first principles through data structures and algorithms using a dependency-enforced concept graph.',
    'Computer Science',
    'published'
  );
  const course1Id = Number(course1Res.lastInsertRowid);

  const insertConcept = db.prepare(
    'INSERT INTO concepts (course_id, title, description, lesson_content, video_url, estimated_duration, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (concept_id, title, mastery_threshold) VALUES (?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)'
  );

  const conceptKeyToId = new Map<string, number>();
  const conceptKeyToQuizId = new Map<string, number>();

  for (const c of PROGRAMMING_CONCEPTS) {
    const cRes = insertConcept.run(
      course1Id,
      c.title,
      c.description,
      c.lesson_content,
      c.video_url,
      c.estimated_duration,
      'active'
    );
    const conceptId = Number(cRes.lastInsertRowid);
    conceptKeyToId.set(c.key, conceptId);

    const qRes = insertQuiz.run(conceptId, `${c.title} Mastery Check`, c.threshold);
    const quizId = Number(qRes.lastInsertRowid);
    conceptKeyToQuizId.set(c.key, quizId);

    for (const q of c.questions) {
      insertQuestion.run(quizId, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation);
    }
  }

  const insertPrereq = db.prepare(
    'INSERT INTO prerequisites (course_id, prerequisite_concept_id, dependent_concept_id) VALUES (?, ?, ?)'
  );
  for (const [fromKey, toKey] of PROGRAMMING_EDGES) {
    insertPrereq.run(course1Id, conceptKeyToId.get(fromKey)!, conceptKeyToId.get(toKey)!);
  }

  // Course 2: Discoverable / Enrollable Course for testing fresh enrollment
  const course2Res = insertCourse.run(
    instructorId,
    'Graph Theory & Problem Solving',
    'Explore directed graphs, reachability, topological sorting, and shortest-path reasoning from scratch.',
    'Algorithms & Math',
    'published'
  );
  const course2Id = Number(course2Res.lastInsertRowid);

  const graphCourseConcepts: SeedConcept[] = [
    {
      key: 'gt_nodes',
      title: 'Vertices & Directed Edges',
      description: 'Model entities and one-way dependencies cleanly as nodes and arrows.',
      lesson_content: 'A directed graph G = (V, E) consists of vertices V and ordered pairs (u, v) representing one-way dependencies from u to v.',
      video_url: 'https://www.youtube.com/watch?v=09_LlHjoEiY',
      estimated_duration: 15,
      threshold: 70,
      questions: [
        {
          question: 'In a directed prerequisite edge A -> B, which concept must be learned first?',
          options: ['Concept A', 'Concept B', 'Either simultaneously', 'Neither'],
          correct_answer: 0,
          explanation: 'A -> B means A is a prerequisite for B.',
        },
        {
          question: 'What are the two fundamental sets defining a graph G = (V, E)?',
          options: ['Vertices and Edges', 'Loops and Strings', 'Classes and CSS', 'Rows and Fonts'],
          correct_answer: 0,
          explanation: 'Graphs are defined by vertices (nodes) and edges (connections).',
        },
      ],
    },
    {
      key: 'gt_bfs',
      title: 'Breadth-First Traversal',
      description: 'Explore graph neighborhoods level-by-level using queues.',
      lesson_content: 'BFS visits all immediate neighbors before moving deeper, ideal for unweighted shortest paths and ancestor discovery.',
      video_url: 'https://www.youtube.com/watch?v=oDqjPvD54Ss',
      estimated_duration: 20,
      threshold: 70,
      questions: [
        {
          question: 'Which data structure drives Breadth-First Search?',
          options: ['Queue (FIFO)', 'Stack (LIFO)', 'Priority Inversion', 'File System'],
          correct_answer: 0,
          explanation: 'Queues ensure level-order exploration in BFS.',
        },
        {
          question: 'In an unweighted graph, what does BFS find from a source node?',
          options: ['Shortest path by edge count', 'Longest cycle', 'Alphabetical order', 'Disk usage'],
          correct_answer: 0,
          explanation: 'BFS explores by distance layer, guaranteeing shortest hop count.',
        },
      ],
    },
    {
      key: 'gt_dfs',
      title: 'Depth-First Cycle Detection',
      description: 'Detect circular dependencies using 3-color DFS state tracking.',
      lesson_content: 'Tracking Unvisited (0), Visiting (1), and Visited (2) states detects back edges whenever DFS reaches a node currently on the recursion stack.',
      video_url: 'https://www.youtube.com/watch?v=7fujYZs0364',
      estimated_duration: 25,
      threshold: 70,
      questions: [
        {
          question: 'In 3-color DFS, hitting which node state signals a directed cycle?',
          options: ['Visiting (Gray / currently in recursion stack)', 'Unvisited (White)', 'Visited (Black)', 'Root'],
          correct_answer: 0,
          explanation: 'Reaching an ancestor currently in the active recursion stack proves a back-edge cycle.',
        },
        {
          question: 'Why do curriculum graphs reject cycles?',
          options: [
            'A cycle means two topics require each other, creating an impossible unlock deadlock',
            'Cycles look slightly curved',
            'Cycles require more RAM',
            'Cycles double video length',
          ],
          correct_answer: 0,
          explanation: 'Circular prerequisites make it impossible for a learner to unlock either concept first.',
        },
      ],
    },
    {
      key: 'gt_topo',
      title: 'Topological Ordering',
      description: 'Schedule dependent tasks cleanly in valid prerequisite order.',
      lesson_content: 'Kahn’s algorithm repeatedly selects zero in-degree nodes and decrements neighbor in-degrees to emit a valid linear study order.',
      video_url: 'https://www.youtube.com/watch?v=cIBFEhD77b4',
      estimated_duration: 25,
      threshold: 70,
      questions: [
        {
          question: 'Which nodes can Kahn’s algorithm place first in a topological ordering?',
          options: [
            'Nodes with in-degree 0 (no unmet prerequisites)',
            'Nodes with highest out-degree',
            'The last node in the database',
            'Any random node',
          ],
          correct_answer: 0,
          explanation: 'Only nodes with zero incoming prerequisite edges have no dependencies to wait on.',
        },
        {
          question: 'If Kahn’s algorithm processes fewer than |V| nodes, what does that prove?',
          options: ['The graph contains at least one cycle', 'All nodes are mastered', 'The graph is empty', 'Every node is disconnected'],
          correct_answer: 0,
          explanation: 'Nodes trapped in a cycle never reach in-degree 0.',
        },
      ],
    },
  ];

  const c2Ids = new Map<string, number>();
  for (const c of graphCourseConcepts) {
    const cRes = insertConcept.run(
      course2Id,
      c.title,
      c.description,
      c.lesson_content,
      c.video_url,
      c.estimated_duration,
      'active'
    );
    const cid = Number(cRes.lastInsertRowid);
    c2Ids.set(c.key, cid);
    const qRes = insertQuiz.run(cid, `${c.title} Mastery Check`, c.threshold);
    const qid = Number(qRes.lastInsertRowid);
    for (const q of c.questions) {
      insertQuestion.run(qid, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation);
    }
  }
  insertPrereq.run(course2Id, c2Ids.get('gt_nodes')!, c2Ids.get('gt_bfs')!);
  insertPrereq.run(course2Id, c2Ids.get('gt_nodes')!, c2Ids.get('gt_dfs')!);
  insertPrereq.run(course2Id, c2Ids.get('gt_bfs')!, c2Ids.get('gt_topo')!);
  insertPrereq.run(course2Id, c2Ids.get('gt_dfs')!, c2Ids.get('gt_topo')!);

  // Enroll learners in Course 1 with distinct mastery states
  const insertEnroll = db.prepare(
    'INSERT INTO enrollments (learner_id, course_id, target_concept_id, status) VALUES (?, ?, ?, ?)'
  );
  const insertLessonProg = db.prepare(
    'INSERT INTO lessons_progress (learner_id, concept_id, completed, completed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)'
  );
  const insertAttempt = db.prepare(
    'INSERT INTO quiz_attempts (learner_id, quiz_id, score, passed, answers_json) VALUES (?, ?, ?, ?, ?)'
  );
  const insertMastery = db.prepare(
    'INSERT INTO concept_mastery (learner_id, concept_id, mastery_status, best_score, mastered_at) VALUES (?, ?, ?, ?, ?)'
  );

  // 1. Aarav: mastered intro, variables, data_types, operators, conditionals; failed loops (55%) -> Functions & Recursion locked!
  insertEnroll.run(aaravId, course1Id, conceptKeyToId.get('algorithms')!, 'active');
  const aaravMastered: Array<[string, number]> = [
    ['intro', 100],
    ['variables', 90],
    ['data_types', 85],
    ['operators', 80],
    ['conditionals', 80],
  ];
  for (const [key, score] of aaravMastered) {
    const cid = conceptKeyToId.get(key)!;
    const qid = conceptKeyToQuizId.get(key)!;
    insertLessonProg.run(aaravId, cid);
    insertAttempt.run(aaravId, qid, score, 1, JSON.stringify([0, 1, 1]));
    insertMastery.run(aaravId, cid, 'mastered', score, new Date().toISOString());
  }
  // Loops lesson completed, quiz failed at 55%
  const loopsId = conceptKeyToId.get('loops')!;
  const loopsQuizId = conceptKeyToQuizId.get('loops')!;
  insertLessonProg.run(aaravId, loopsId);
  insertAttempt.run(aaravId, loopsQuizId, 55, 0, JSON.stringify([0, 0, 1]));
  insertMastery.run(aaravId, loopsId, 'in_progress', 55, null);

  // 2. Priya: mastered intro only -> Variables unlocked!
  insertEnroll.run(priyaId, course1Id, conceptKeyToId.get('recursion')!, 'active');
  insertLessonProg.run(priyaId, conceptKeyToId.get('intro')!);
  insertAttempt.run(priyaId, conceptKeyToQuizId.get('intro')!, 95, 1, JSON.stringify([0, 1, 1]));
  insertMastery.run(priyaId, conceptKeyToId.get('intro')!, 'mastered', 95, new Date().toISOString());

  // 3. Rohan: mastered 11 concepts up to Arrays, Strings, Pointers, Function Parameters, Return Values
  insertEnroll.run(rohanId, course1Id, conceptKeyToId.get('algorithms')!, 'active');
  const rohanMastered = [
    'intro',
    'variables',
    'data_types',
    'operators',
    'conditionals',
    'loops',
    'functions',
    'function_params',
    'return_values',
    'arrays',
    'pointers',
  ];
  for (const key of rohanMastered) {
    const cid = conceptKeyToId.get(key)!;
    const qid = conceptKeyToQuizId.get(key)!;
    insertLessonProg.run(rohanId, cid);
    insertAttempt.run(rohanId, qid, 90, 1, JSON.stringify([0, 1, 1]));
    insertMastery.run(rohanId, cid, 'mastered', 90, new Date().toISOString());
  }

  // Initial curriculum history entry for Course 1
  db.prepare(
    `INSERT INTO curriculum_history
      (course_id, instructor_id, change_type, previous_structure, updated_structure, change_description, affected_concepts, affected_learners_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    course1Id,
    instructorId,
    'initial_publish',
    JSON.stringify({ concepts: 0, edges: 0 }),
    JSON.stringify({ concepts: PROGRAMMING_CONCEPTS.length, edges: PROGRAMMING_EDGES.length }),
    'Published 15-concept Programming Fundamentals to Advanced Concepts prerequisite graph.',
    JSON.stringify(PROGRAMMING_CONCEPTS.map((c) => c.title)),
    3
  );

  // Welcome notifications
  const insertNotif = db.prepare(
    'INSERT INTO notifications (user_id, course_id, message, message_key, message_params, read_status) VALUES (?, ?, ?, ?, ?, 0)'
  );
  insertNotif.run(
    aaravId,
    course1Id,
    'Your personalized learning path to Algorithms is ready. Master Loops to unlock Arrays and Recursion.',
    'notif.welcome_path',
    JSON.stringify({ target: 'Algorithms', next: 'Loops' })
  );
  insertNotif.run(
    rohanId,
    course1Id,
    'You have mastered 11 of 15 concepts. Data Structures and Recursion are now unlocked.',
    'notif.progress_milestone',
    JSON.stringify({ mastered: 11, total: 15 })
  );

  seedAdditionalCoursesIfMissing(db);
}

interface ExtraCourseBlueprint {
  title: string;
  description: string;
  category: string;
  concepts: SeedConcept[];
  edges: Array<[string, string]>;
}

const ADDITIONAL_COURSES: ExtraCourseBlueprint[] = [
  {
    title: 'Web Engineering & Full-Stack Architecture',
    description:
      'Progress systematically from semantic markup and responsive CSS through JavaScript DOM events, React components, and RESTful Express backends.',
    category: 'Web Development',
    concepts: [
      {
        key: 'web_html',
        title: 'Semantic HTML & Accessibility',
        description: 'Structure web documents cleanly with landmarks, forms, and ARIA semantics.',
        lesson_content: `Semantic HTML gives meaning and keyboard/screen-reader accessibility to every page section before any styling or scripting is applied.

Key Practices:
1. Landmark Elements: Use <header>, <nav>, <main>, <section>, and <footer> instead of anonymous nested <div> containers.
2. Accessible Controls: Pair <label> elements with form inputs and use <button> for actions rather than clickable spans.
3. Document Outline: Maintain a single logical <h1> followed by sequential heading levels.`,
        video_url: 'https://www.youtube.com/watch?v=kUMe1FH4CHE',
        estimated_duration: 20,
        threshold: 70,
        questions: [
          {
            question: 'Why should interactive actions use native <button> elements instead of <div> tags?',
            options: [
              'Native buttons provide built-in keyboard focus, Enter/Space activation, and screen-reader roles',
              'Buttons automatically connect to SQLite',
              'Div tags cannot accept CSS classes',
              'Buttons load images twice as fast',
            ],
            correct_answer: 0,
            explanation: 'Native <button> elements carry built-in accessibility semantics and keyboard interaction.',
          },
          {
            question: 'Which HTML element identifies the primary unique content of a page?',
            options: ['<main>', '<script>', '<meta>', '<br>'],
            correct_answer: 0,
            explanation: 'The <main> landmark wraps the core page content.',
          },
        ],
      },
      {
        key: 'web_css',
        title: 'Modern CSS & Responsive Layouts',
        description: 'Build adaptive layouts using Flexbox, CSS Grid, and fluid spacing scales.',
        lesson_content: `Modern CSS layouts adapt smoothly across mobile, tablet, and desktop viewports using Grid and Flexbox.

Core Layout Tools:
1. Flexbox: Ideal for one-dimensional rows or columns (navigation bars, button groups).
2. CSS Grid: Ideal for two-dimensional page structures and multi-column card layouts.
3. Mobile-First Breakpoints: Define base readable spacing first and expand columns at md/lg widths.`,
        video_url: 'https://www.youtube.com/watch?v=JJSoZeoSYgM',
        estimated_duration: 25,
        threshold: 70,
        questions: [
          {
            question: 'Which CSS layout system is designed primarily for two-dimensional rows and columns simultaneously?',
            options: ['CSS Grid', 'Float left', 'Text-align', 'Z-index'],
            correct_answer: 0,
            explanation: 'CSS Grid manages both rows and columns in a single container.',
          },
          {
            question: 'What does mobile-first responsive styling mean?',
            options: [
              'Designing clean single-column defaults first and layering multi-column breakpoints for larger screens',
              'Blocking desktop browsers completely',
              'Hardcoding 1440px widths on every element',
              'Disabling text wrapping',
            ],
            correct_answer: 0,
            explanation: 'Mobile-first CSS builds a clean base layout and enhances it progressively via min-width breakpoints.',
          },
        ],
      },
      {
        key: 'web_js_dom',
        title: 'JavaScript & DOM Events',
        description: 'Handle user interactions, asynchronous fetch calls, and state updates in the browser.',
        lesson_content: `JavaScript brings static documents to life by listening to user events, updating the Document Object Model (DOM), and communicating with backend APIs via fetch().

Core Mechanics:
1. Event Listeners: Respond cleanly to clicks, form submissions, and keyboard input.
2. Async / Await & Fetch: Request JSON data from REST endpoints without blocking the UI thread.
3. Error & Loading States: Always provide clear feedback while asynchronous requests are in flight.`,
        video_url: 'https://www.youtube.com/watch?v=5fb2aPlgoys',
        estimated_duration: 30,
        threshold: 70,
        questions: [
          {
            question: 'What does event.preventDefault() accomplish inside a form submit handler?',
            options: [
              'Prevents the browser from triggering a full page reload so JavaScript can submit via fetch()',
              'Deletes the form inputs',
              'Encrypts CSS files',
              'Closes the browser tab',
            ],
            correct_answer: 0,
            explanation: 'SPA forms call preventDefault() to handle validation and API submission smoothly in JavaScript.',
          },
          {
            question: 'Why do modern browsers use async/await with fetch()?',
            options: [
              'To wait for network responses cleanly without freezing the user interface',
              'To skip HTTP status codes',
              'To replace HTML tags',
              'To disable JSON parsing',
            ],
            correct_answer: 0,
            explanation: 'Asynchronous requests keep the UI responsive while waiting for server data.',
          },
        ],
      },
      {
        key: 'web_react',
        title: 'React Component Architecture',
        description: 'Compose declarative UI trees with props, hooks, and predictable state flow.',
        lesson_content: `React models interfaces as pure functions of state, breaking complex pages into reusable, composable components.

Foundations:
1. Props & Composition: Pass data downward clearly and keep components focused on single responsibilities.
2. Hooks (useState, useEffect, useMemo): Manage local UI state, synchronize side effects, and memoize derived calculations.
3. Lifting State: Share state cleanly via common parent components or React Context.`,
        video_url: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
        estimated_duration: 35,
        threshold: 70,
        questions: [
          {
            question: 'Why should React state never be mutated directly without calling its setter function?',
            options: [
              'React relies on the state setter to schedule re-renders and keep the UI synchronized',
              'Mutating objects turns CSS into HTML',
              'Setters automatically delete database rows',
              'Direct mutation disables JavaScript loops',
            ],
            correct_answer: 0,
            explanation: 'Calling the setter notifies React that state changed so the component re-renders.',
          },
          {
            question: 'What is the purpose of a unique key prop when rendering lists in React?',
            options: [
              'It helps React identify which list items changed, were added, or were removed efficiently',
              'It encrypts user passwords',
              'It changes the font family',
              'It runs SQL queries',
            ],
            correct_answer: 0,
            explanation: 'Stable keys enable accurate reconciliation during list updates.',
          },
        ],
      },
      {
        key: 'web_api',
        title: 'REST APIs & Express Backend',
        description: 'Design resource-oriented HTTP endpoints with validation and status codes.',
        lesson_content: `Express servers expose structured REST endpoints that enforce validation, authentication, and business rules on the server.

API Principles:
1. Resource Verbs: Use GET to read, POST to create, PUT/PATCH to update, and DELETE to remove.
2. Meaningful Status Codes: Return 201 for creation, 400 for validation failures, 401/403 for auth/permissions, and 404 when missing.
3. Server-Side Invariants: Never trust client-only checks for permissions or graph constraints.`,
        video_url: 'https://www.youtube.com/watch?v=SccSCuHhOw0',
        estimated_duration: 30,
        threshold: 70,
        questions: [
          {
            question: 'Which HTTP status code appropriately rejects a request that fails prerequisite unlocking rules?',
            options: ['403 Forbidden', '200 OK', '201 Created', '304 Not Modified'],
            correct_answer: 0,
            explanation: '403 Forbidden signals that the authenticated user is not permitted to access the locked resource.',
          },
          {
            question: 'Why must critical validation run on the backend even when the frontend validates inputs?',
            options: [
              'Clients can be bypassed directly via curl or API tools, so the backend is the source of truth',
              'Frontend JavaScript cannot compare numbers',
              'Browsers ignore POST requests',
              'Backend code cannot return JSON',
            ],
            correct_answer: 0,
            explanation: 'Server validation protects data integrity regardless of how the API is called.',
          },
        ],
      },
      {
        key: 'web_fullstack',
        title: 'Full-Stack State & Persistence',
        description: 'Connect React frontends, Express APIs, and relational databases end-to-end.',
        lesson_content: `Production full-stack applications synchronize UI views with durable database transactions across reloads and sessions.

End-to-End Flow:
1. Auth Tokens: Persist signed JWT tokens safely and attach Bearer headers on authenticated API requests.
2. Optimistic vs. Verified Updates: Re-fetch or reconcile derived state (such as unlocked nodes) directly from server responses.
3. Transactions: Wrap multi-table updates in database transactions so partial failures never corrupt state.`,
        video_url: 'https://www.youtube.com/watch?v=nu_pCVPKzTk',
        estimated_duration: 40,
        threshold: 70,
        questions: [
          {
            question: 'Why should multi-step curriculum updates run inside a database transaction?',
            options: [
              'So either all related changes succeed together or none apply if an error occurs',
              'To make HTML tables wider',
              'To skip authentication checks',
              'To convert SQL into CSS',
            ],
            correct_answer: 0,
            explanation: 'Atomic transactions guarantee consistency across tables.',
          },
          {
            question: 'Where should user progress be stored so it survives browser refreshes and device switches?',
            options: [
              'In the backend database via REST APIs',
              'Only in temporary React component variables',
              'Inside CSS comments',
              'In image alt text',
            ],
            correct_answer: 0,
            explanation: 'Database persistence preserves learner state across sessions and devices.',
          },
        ],
      },
    ],
    edges: [
      ['web_html', 'web_css'],
      ['web_html', 'web_js_dom'],
      ['web_css', 'web_react'],
      ['web_js_dom', 'web_react'],
      ['web_js_dom', 'web_api'],
      ['web_react', 'web_fullstack'],
      ['web_api', 'web_fullstack'],
    ],
  },
  {
    title: 'Relational Databases & SQL Mastery',
    description:
      'Design normalized relational schemas, enforce referential integrity with foreign keys, write expressive multi-table SQL joins, and optimize queries with indexes.',
    category: 'Databases',
    concepts: [
      {
        key: 'db_modeling',
        title: 'Relational Data Modeling',
        description: 'Represent real-world entities, attributes, and cardinalities as tables.',
        lesson_content: `Relational modeling organizes application data into structured tables (relations) with typed columns and well-defined relationships.

Core Building Blocks:
1. Entities & Rows: Each table captures one entity type (users, courses, concepts), and each row is a single record.
2. Cardinality: Identify 1:1, 1:N (course to concepts), and M:N (learners to courses via enrollments) relationships early.
3. Constraints: Enforce NOT NULL and CHECK constraints at the schema level.`,
        video_url: 'https://www.youtube.com/watch?v=ztHopE5Wnpc',
        estimated_duration: 20,
        threshold: 70,
        questions: [
          {
            question: 'How is a many-to-many relationship (such as Learners and Courses) modeled in SQL?',
            options: [
              'Using a junction/bridge table such as enrollments with foreign keys to both tables',
              'Storing comma-separated IDs inside a single text column',
              'Creating 100 duplicate course tables',
              'Deleting primary keys',
            ],
            correct_answer: 0,
            explanation: 'A junction table cleanly models many-to-many associations with referential integrity.',
          },
          {
            question: 'What does a CHECK constraint enforce in SQL?',
            options: [
              'That column values satisfy a specific boolean condition on insert or update',
              'Automatic JSON formatting',
              'UI font sizing',
              'Network routing',
            ],
            correct_answer: 0,
            explanation: 'CHECK constraints validate allowed values directly inside the database engine.',
          },
        ],
      },
      {
        key: 'db_keys',
        title: 'Primary & Foreign Keys',
        description: 'Guarantee unique row identity and referential integrity across tables.',
        lesson_content: `Keys bind relational tables together reliably and prevent orphaned records.

Key Types:
1. Primary Key (PK): Uniquely identifies every row in a table (e.g., id INTEGER PRIMARY KEY).
2. Foreign Key (FK): References a primary key in another table, ensuring every prerequisite_concept_id points to a real concept.
3. Cascading vs. Archival Policies: Decide deliberately between ON DELETE CASCADE and soft status archival when preserving history.`,
        video_url: 'https://www.youtube.com/watch?v=8wUU93T9x3M',
        estimated_duration: 20,
        threshold: 70,
        questions: [
          {
            question: 'What does enabling foreign key enforcement prevent?',
            options: [
              'Inserting child records that reference nonexistent parent rows',
              'Selecting columns with WHERE',
              'Sorting results alphabetically',
              'Using integer columns',
            ],
            correct_answer: 0,
            explanation: 'Foreign keys preserve referential integrity across related tables.',
          },
          {
            question: 'Why might an EdTech platform archive a split concept with status="retired" instead of hard-deleting it?',
            options: [
              'To preserve historical quiz attempts and learner mastery records tied to that concept ID',
              'Because SQLite cannot run DELETE statements',
              'To increase database bugs',
              'To hide course titles',
            ],
            correct_answer: 0,
            explanation: 'Soft archival keeps historical learner records intact across curriculum updates.',
          },
        ],
      },
      {
        key: 'db_queries',
        title: 'SQL Queries & Filtering',
        description: 'Retrieve, filter, aggregate, and sort relational records with SELECT.',
        lesson_content: `SQL provides a declarative language to ask for the exact slice of data your application needs.

Essential Clauses:
1. SELECT & WHERE: Choose specific columns and filter rows by exact predicates.
2. ORDER BY & LIMIT: Sort results deterministically and paginate large lists.
3. GROUP BY & Aggregates: Compute COUNT(), SUM(), AVG(), and MAX() across groups.`,
        video_url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
        estimated_duration: 25,
        threshold: 70,
        questions: [
          {
            question: 'Which SQL clause filters individual rows before grouping or sorting?',
            options: ['WHERE', 'ORDER BY', 'LIMIT', 'CREATE'],
            correct_answer: 0,
            explanation: 'WHERE filters rows prior to aggregation and sorting.',
          },
          {
            question: 'Which aggregate function computes a learner’s highest score across quiz attempts?',
            options: ['MAX(score)', 'COUNT(*)', 'LOWER(score)', 'INSERT(score)'],
            correct_answer: 0,
            explanation: 'MAX() returns the largest value in a column.',
          },
        ],
      },
      {
        key: 'db_joins',
        title: 'Joins & Multi-Table Queries',
        description: 'Combine normalized tables using INNER JOIN and LEFT JOIN.',
        lesson_content: `Because normalized schemas store entities in separate tables, JOIN operations reunite related data cleanly in a single query.

Join Patterns:
1. INNER JOIN: Returns rows that have matching keys in both tables.
2. LEFT JOIN: Keeps all rows from the left table even when no matching row exists yet on the right (such as concepts without mastery records yet).
3. Table Aliases: Keep multi-table queries concise and readable.`,
        video_url: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw',
        estimated_duration: 30,
        threshold: 70,
        questions: [
          {
            question: 'When should you prefer LEFT JOIN over INNER JOIN?',
            options: [
              'When you want all records from the primary table even if related optional records do not exist yet',
              'When you want to delete both tables',
              'When there are no columns in either table',
              'Only inside CSS files',
            ],
            correct_answer: 0,
            explanation: 'LEFT JOIN preserves unmatched rows from the left table with NULLs for missing right columns.',
          },
          {
            question: 'What condition links tables inside an ON clause?',
            options: [
              'Matching a foreign key column to its referenced primary key',
              'Comparing random strings',
              'Setting the server port',
              'Sorting timestamps',
            ],
            correct_answer: 0,
            explanation: 'Joins typically match foreign keys to primary keys.',
          },
        ],
      },
      {
        key: 'db_norm',
        title: 'Normalization & Schema Integrity',
        description: 'Eliminate redundant data anomalies using First, Second, and Third Normal Forms.',
        lesson_content: `Normalization removes duplicated data so updates happen in one canonical place without contradictions.

Normal Forms Summary:
1. 1NF: Atomic column values — no repeating arrays packed into single text cells when separate rows belong in a child table.
2. 2NF & 3NF: Every non-key attribute depends strictly on the primary key, preventing update and deletion anomalies.
3. Unique Constraints: Prevent duplicate enrollments or duplicate prerequisite edges.`,
        video_url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8',
        estimated_duration: 25,
        threshold: 70,
        questions: [
          {
            question: 'What problem does database normalization primarily prevent?',
            options: [
              'Data redundancy and inconsistent update/insertion/deletion anomalies',
              'High screen brightness',
              'Slow CSS animations',
              'Missing HTML titles',
            ],
            correct_answer: 0,
            explanation: 'Normalization ensures each fact is stored once in its canonical table.',
          },
          {
            question: 'How does UNIQUE(course_id, prerequisite_concept_id, dependent_concept_id) help a graph table?',
            options: [
              'It prevents duplicate identical prerequisite edges between the same two concepts',
              'It allows cycles',
              'It deletes all courses',
              'It disables indexes',
            ],
            correct_answer: 0,
            explanation: 'Composite unique constraints block duplicate edge rows at the database level.',
          },
        ],
      },
      {
        key: 'db_indexes',
        title: 'Indexes & Query Optimization',
        description: 'Accelerate lookups with B-Tree indexes and analyze execution plans.',
        lesson_content: `As tables grow, full table scans become slow. Indexes create sorted lookup structures (B-Trees) for rapid retrieval.

Optimization Guidelines:
1. Index Foreign Keys & Hot Filters: Index columns frequently used in WHERE and JOIN clauses (e.g., course_id, learner_id).
2. Read-Write Tradeoff: Indexes speed up SELECT queries while adding minor overhead to INSERT/UPDATE operations.
3. Parameterized Queries: Always bind parameters (?) to prevent SQL injection and reuse query plans.`,
        video_url: 'https://www.youtube.com/watch?v=-qNSXK7s7_w',
        estimated_duration: 35,
        threshold: 70,
        questions: [
          {
            question: 'Why should you avoid creating indexes on every single column indiscriminately?',
            options: [
              'Each extra index consumes storage and slows down INSERT, UPDATE, and DELETE writes',
              'Indexes break SELECT queries',
              'Indexes delete foreign keys',
              'SQLite allows only one index per database',
            ],
            correct_answer: 0,
            explanation: 'Indexes accelerate reads at the cost of extra disk space and write maintenance.',
          },
          {
            question: 'Why are parameterized SQL queries (using ?) mandatory in production?',
            options: [
              'They neutralize SQL injection attacks by separating SQL syntax from user-supplied values',
              'They convert SQLite into MongoDB',
              'They bypass authentication',
              'They remove primary keys',
            ],
            correct_answer: 0,
            explanation: 'Bound parameters treat user input strictly as data, never executable SQL.',
          },
        ],
      },
    ],
    edges: [
      ['db_modeling', 'db_keys'],
      ['db_modeling', 'db_queries'],
      ['db_keys', 'db_joins'],
      ['db_queries', 'db_joins'],
      ['db_keys', 'db_norm'],
      ['db_joins', 'db_indexes'],
      ['db_norm', 'db_indexes'],
    ],
  },
  {
    title: 'Python for Data Science & Machine Learning',
    description:
      'Build quantitative foundations from Python essentials and vectorized NumPy arrays through Pandas data engineering, probability, and supervised ML models.',
    category: 'Data Science & AI',
    concepts: [
      {
        key: 'py_core',
        title: 'Python Core & Environments',
        description: 'Write idiomatic Python functions, list comprehensions, and isolated virtualenvs.',
        lesson_content: `Python’s readable syntax and rich scientific ecosystem make it the standard language for data analysis and machine learning.

Foundations:
1. Clean Data Structures: Lists, dictionaries, sets, and tuples form the backbone of data pipelines.
2. List Comprehensions: Express transformations concisely: [x * 2 for x in scores if x >= 70].
3. Virtual Environments: Isolate project dependencies cleanly with venv and requirements files.`,
        video_url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
        estimated_duration: 20,
        threshold: 70,
        questions: [
          {
            question: 'Which Python built-in collection guarantees unique elements with fast membership lookup?',
            options: ['set', 'list', 'tuple', 'string'],
            correct_answer: 0,
            explanation: 'Python sets store unique hashable elements with O(1) average lookup.',
          },
          {
            question: 'Why do data engineers use virtual environments (venv)?',
            options: [
              'To isolate package versions per project and prevent dependency conflicts',
              'To speed up monitor refresh rates',
              'To replace SQL databases',
              'To compile CSS files',
            ],
            correct_answer: 0,
            explanation: 'Virtual environments keep project dependencies reproducible and isolated.',
          },
        ],
      },
      {
        key: 'py_numpy',
        title: 'NumPy Arrays & Vectorization',
        description: 'Perform fast matrix arithmetic and broadcasting without slow Python loops.',
        lesson_content: `NumPy introduces contiguous N-dimensional arrays (ndarray) backed by compiled C routines for rapid numerical computing.

Key Concepts:
1. Vectorized Operations: Add or multiply entire arrays in one expression instead of element-by-element Python loops.
2. Shapes & Broadcasting: Align arrays of compatible dimensions automatically during arithmetic.
3. Slicing & Views: Slice rows and columns without copying underlying memory unnecessarily.`,
        video_url: 'https://www.youtube.com/watch?v=QUT1VHiLmmI',
        estimated_duration: 25,
        threshold: 70,
        questions: [
          {
            question: 'Why is vectorized NumPy arithmetic much faster than Python for-loops on large datasets?',
            options: [
              'Operations execute on homogeneous contiguous memory inside compiled C loops',
              'NumPy skips floating-point math',
              'NumPy sends every number over HTTP',
              'Python loops cannot add integers',
            ],
            correct_answer: 0,
            explanation: 'Vectorization avoids per-element Python interpreter overhead.',
          },
          {
            question: 'What property inspects the dimensions (rows, columns) of a NumPy ndarray?',
            options: ['.shape', '.html', '.font', '.routes'],
            correct_answer: 0,
            explanation: 'arr.shape returns a tuple describing the size along each axis.',
          },
        ],
      },
      {
        key: 'py_pandas',
        title: 'Pandas DataFrames & Cleaning',
        description: 'Load tabular datasets, handle missing values, and compute grouped summaries.',
        lesson_content: `Pandas builds labeled 2D DataFrames atop NumPy to make tabular data inspection and cleaning intuitive.

Workflows:
1. Inspection: Use .head(), .info(), and .describe() to audit schemas and distributions.
2. Cleaning: Handle missing values (.dropna(), .fillna()) and cast column types reliably.
3. GroupBy Aggregation: Summarize metrics across categories cleanly.`,
        video_url: 'https://www.youtube.com/watch?v=vmEHCJofslg',
        estimated_duration: 30,
        threshold: 70,
        questions: [
          {
            question: 'Which Pandas method groups rows by a category column to compute summary statistics?',
            options: ['df.groupby()', 'df.render()', 'df.style()', 'df.loop()'],
            correct_answer: 0,
            explanation: 'groupby() splits data into groups, applies an aggregation, and combines results.',
          },
          {
            question: 'Why must missing values be addressed before training most ML models?',
            options: [
              'Many mathematical algorithms cannot compute gradients or distances over NaN entries',
              'Missing values double CSV font sizes',
              'Pandas deletes files containing zeros',
              'Models only accept strings',
            ],
            correct_answer: 0,
            explanation: 'NaN values break numeric matrix operations unless imputed or filtered.',
          },
        ],
      },
      {
        key: 'py_viz',
        title: 'Data Visualization & Storytelling',
        description: 'Select clear charts—histograms, scatter plots, and box plots—for exploratory analysis.',
        lesson_content: `Visualizing distributions and relationships exposes outliers, skew, and correlations before modeling.

Chart Selection:
1. Histograms & Box Plots: Reveal distribution shape, spread, and outliers for single variables.
2. Scatter Plots: Show correlation and non-linear patterns between two continuous variables.
3. Clarity First: Label axes with explicit units and avoid cluttering plots with unnecessary 3D effects.`,
        video_url: 'https://www.youtube.com/watch?v=a9UrKTVEeZA',
        estimated_duration: 25,
        threshold: 70,
        questions: [
          {
            question: 'Which chart best reveals whether two continuous variables have a linear or curved relationship?',
            options: ['Scatter plot', 'Pie chart', 'Single KPI number', 'Word cloud'],
            correct_answer: 0,
            explanation: 'Scatter plots map pairs of continuous measurements directly onto X and Y axes.',
          },
          {
            question: 'What does a histogram display?',
            options: [
              'The frequency distribution of values across binned intervals',
              'Database foreign keys',
              'Network latency logs',
              'File directory trees',
            ],
            correct_answer: 0,
            explanation: 'Histograms group continuous values into bins to show distribution density.',
          },
        ],
      },
      {
        key: 'py_math',
        title: 'Probability & Linear Algebra Basics',
        description: 'Master dot products, matrix multiplication, variance, and Bayes reasoning.',
        lesson_content: `Linear algebra and probability form the mathematical engine behind every machine learning algorithm.

Essential Tools:
1. Vectors & Dot Products: Measure similarity and compute weighted feature sums (w · x + b).
2. Mean, Variance & Standard Deviation: Quantify central tendency and spread for feature scaling.
3. Conditional Probability: Reason cleanly about uncertainty and class likelihoods.`,
        video_url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
        estimated_duration: 30,
        threshold: 70,
        questions: [
          {
            question: 'What geometric operation does the weighted sum w · x + b in a linear model rely on?',
            options: ['Vector dot product', 'String concatenation', 'HTML parsing', 'Topological sort'],
            correct_answer: 0,
            explanation: 'Linear predictions compute the dot product between feature vector x and weight vector w.',
          },
          {
            question: 'Why do engineers standardize features (zero mean, unit variance) before training gradient-based models?',
            options: [
              'So features on large scales do not dominate optimization over smaller-scale features',
              'To delete half of the training rows',
              'To disable validation splits',
              'To convert numbers into images',
            ],
            correct_answer: 0,
            explanation: 'Feature scaling balances gradient steps and accelerates convergence.',
          },
        ],
      },
      {
        key: 'py_ml',
        title: 'Supervised Machine Learning',
        description: 'Train, evaluate, and regularize regression and classification pipelines without data leakage.',
        lesson_content: `Supervised learning maps input features X to target labels y using labeled historical examples while guarding against overfitting.

Pipeline Discipline:
1. Train / Validation / Test Split: Hold out unseen test data before fitting scalers or models to avoid data leakage.
2. Regression vs. Classification: Predict continuous targets (RMSE/MAE) or discrete classes (Accuracy, Precision, Recall, F1).
3. Bias-Variance Tradeoff: Use cross-validation and regularization to generalize reliably to new data.`,
        video_url: 'https://www.youtube.com/watch?v=i_LwzRVP7bg',
        estimated_duration: 45,
        threshold: 70,
        questions: [
          {
            question: 'Why must feature scaling statistics (mean/std) be fit ONLY on the training split?',
            options: [
              'To prevent test-set data leakage from inflating evaluation accuracy artificially',
              'Because test sets have no numbers',
              'To slow down evaluation',
              'Because NumPy cannot compute means twice',
            ],
            correct_answer: 0,
            explanation: 'Fitting preprocessing transforms solely on training data preserves an honest unseen test evaluation.',
          },
          {
            question: 'What characterizes an overfitted model?',
            options: [
              'Very high accuracy on training data but poor generalization on unseen validation data',
              'High accuracy on both training and unseen test data',
              'Zero parameters',
              'Equal performance on random noise',
            ],
            correct_answer: 0,
            explanation: 'Overfitting memorizes training noise rather than learning generalizable signal.',
          },
        ],
      },
    ],
    edges: [
      ['py_core', 'py_numpy'],
      ['py_numpy', 'py_pandas'],
      ['py_pandas', 'py_viz'],
      ['py_numpy', 'py_math'],
      ['py_pandas', 'py_ml'],
      ['py_math', 'py_ml'],
    ],
  },
];

export function seedAdditionalCoursesIfMissing(db: Database.Database): void {
  const instructor = db
    .prepare("SELECT id FROM users WHERE role = 'instructor' ORDER BY id ASC LIMIT 1")
    .get() as { id: number } | undefined;
  if (!instructor) return;

  const findCourse = db.prepare('SELECT id FROM courses WHERE title = ?');
  const insertCourse = db.prepare(
    'INSERT INTO courses (instructor_id, title, description, category, status) VALUES (?, ?, ?, ?, ?)'
  );
  const insertConcept = db.prepare(
    'INSERT INTO concepts (course_id, title, description, lesson_content, video_url, estimated_duration, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (concept_id, title, mastery_threshold) VALUES (?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)'
  );
  const insertPrereq = db.prepare(
    'INSERT INTO prerequisites (course_id, prerequisite_concept_id, dependent_concept_id) VALUES (?, ?, ?)'
  );

  for (const blueprint of ADDITIONAL_COURSES) {
    if (findCourse.get(blueprint.title)) {
      continue;
    }

    const tx = db.transaction(() => {
      const cRes = insertCourse.run(
        instructor.id,
        blueprint.title,
        blueprint.description,
        blueprint.category,
        'published'
      );
      const courseId = Number(cRes.lastInsertRowid);
      const keyToId = new Map<string, number>();

      for (const c of blueprint.concepts) {
        const res = insertConcept.run(
          courseId,
          c.title,
          c.description,
          c.lesson_content,
          c.video_url,
          c.estimated_duration,
          'active'
        );
        const conceptId = Number(res.lastInsertRowid);
        keyToId.set(c.key, conceptId);

        const qRes = insertQuiz.run(conceptId, `${c.title} Mastery Check`, c.threshold);
        const quizId = Number(qRes.lastInsertRowid);
        for (const q of c.questions) {
          insertQuestion.run(
            quizId,
            q.question,
            JSON.stringify(q.options),
            q.correct_answer,
            q.explanation
          );
        }
      }

      for (const [fromKey, toKey] of blueprint.edges) {
        insertPrereq.run(courseId, keyToId.get(fromKey)!, keyToId.get(toKey)!);
      }

      db.prepare(
        `INSERT INTO curriculum_history
          (course_id, instructor_id, change_type, previous_structure, updated_structure, change_description, affected_concepts, affected_learners_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        courseId,
        instructor.id,
        'initial_publish',
        JSON.stringify({ concepts: 0, edges: 0 }),
        JSON.stringify({ concepts: blueprint.concepts.length, edges: blueprint.edges.length }),
        `Published ${blueprint.concepts.length}-concept ${blueprint.title} prerequisite graph.`,
        JSON.stringify(blueprint.concepts.map((c) => c.title)),
        0
      );
    });

    tx();
  }
}

