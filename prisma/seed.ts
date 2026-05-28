import { PrismaClient, Role, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create university
  const universities = await Promise.all([
    prisma.university.upsert({
      where: { domain: "fti.edu.al" },
      update: {},
      create: {
        name: "Polytechnic University of Tirana",
        domain: "fti.edu.al",
      },
    }),

    prisma.university.upsert({
      where: { domain: "epoka.edu.al" },
      update: {},
      create: {
        name: "Epoka University",
        domain: "epoka.edu.al",
      },
    }),

    prisma.university.upsert({
      where: { domain: "unitir.edu.al" },
      update: {},
      create: {
        name: "University of Tirana",
        domain: "unitir.edu.al",
      },
    }),

    prisma.university.upsert({
      where: { domain: "uet.edu.al" },
      update: {},
      create: {
        name: "European University of Tirana",
        domain: "uet.edu.al",
      },
    }),
  ]);

  const university = universities[0];

  // Create admin
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fti.edu.al" },
    update: {},
    create: {
      email: "admin@fti.edu.al",
      name: "System Admin",
      passwordHash: adminHash,
      role: Role.ADMIN,
      universityId: university.id,
    },
  });

  // Create teacher
  const teacherHash = await bcrypt.hash("teacher123", 12);
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@fti.edu.al" },
    update: {},
    create: {
      email: "teacher@fti.edu.al",
      name: "Prof. Smith",
      passwordHash: teacherHash,
      role: Role.TEACHER,
      universityId: university.id,
    },
  });

  // Create students
  const studentHash = await bcrypt.hash("student123", 12);
  await prisma.user.upsert({
    where: { email: "alice@fti.edu.al" },
    update: {},
    create: {
      email: "alice@fti.edu.al",
      name: "Alice Johnson",
      passwordHash: studentHash,
      role: Role.STUDENT,
      totalPoints: 350,
      universityId: university.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "bob@fti.edu.al" },
    update: {},
    create: {
      email: "bob@fti.edu.al",
      name: "Bob Chen",
      passwordHash: studentHash,
      role: Role.STUDENT,
      totalPoints: 200,
      universityId: university.id,
    },
  });

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: "Array" },
      update: {},
      create: { name: "Array", category: "Data Structure", color: "#3b82f6" },
    }),
    prisma.tag.upsert({
      where: { name: "Hash Map" },
      update: {},
      create: {
        name: "Hash Map",
        category: "Data Structure",
        color: "#8b5cf6",
      },
    }),
    prisma.tag.upsert({
      where: { name: "Dynamic Programming" },
      update: {},
      create: {
        name: "Dynamic Programming",
        category: "Algorithm",
        color: "#f59e0b",
      },
    }),
    prisma.tag.upsert({
      where: { name: "Binary Search" },
      update: {},
      create: {
        name: "Binary Search",
        category: "Algorithm",
        color: "#10b981",
      },
    }),
    prisma.tag.upsert({
      where: { name: "Two Pointers" },
      update: {},
      create: { name: "Two Pointers", category: "Technique", color: "#ef4444" },
    }),
    prisma.tag.upsert({
      where: { name: "String" },
      update: {},
      create: { name: "String", category: "Data Structure", color: "#06b6d4" },
    }),
  ]);

  // Create problems
  const problem1 = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    update: {},
    create: {
      title: "Two Sum",
      slug: "two-sum",
      description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to target*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
      difficulty: Difficulty.EASY,
      points: 10,
      timeLimit: 2000,
      memoryLimit: 256,
      isPublished: true,
      createdById: teacher.id,
      constraints: `- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9\n- Only one valid answer exists.`,
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
        },
        {
          input: "nums = [3,2,4], target = 6",
          output: "[1,2]",
          explanation: "",
        },
        { input: "nums = [3,3], target = 6", output: "[0,1]", explanation: "" },
      ],
      testCases: [
        { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isHidden: false },
        { input: "[3,2,4]\n6", expectedOutput: "[1,2]", isHidden: false },
        { input: "[3,3]\n6", expectedOutput: "[0,1]", isHidden: true },
        { input: "[1,5,3,7,2]\n9", expectedOutput: "[1,4]", isHidden: true },
      ],
      starterCode: {
        javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Your solution here
};`,
        python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your solution here
        pass`,
        java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here
    }
}`,
        cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your solution here
    }
};`,
      },
      hints: [
        "Try using a hash map to store values you have seen.",
        "For each number, check if its complement (target - num) exists in the map.",
      ],
    },
  });

  const problem2 = await prisma.problem.upsert({
    where: { slug: "valid-parentheses" },
    update: {},
    create: {
      title: "Valid Parentheses",
      slug: "valid-parentheses",
      description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
      difficulty: Difficulty.EASY,
      points: 10,
      timeLimit: 1000,
      memoryLimit: 128,
      isPublished: true,
      createdById: teacher.id,
      constraints: `- 1 <= s.length <= 10^4\n- s consists of parentheses only '()[]{}'.`,
      examples: [
        { input: 's = "()"', output: "true", explanation: "" },
        { input: 's = "()[]{}"', output: "true", explanation: "" },
        { input: 's = "(]"', output: "false", explanation: "" },
      ],
      testCases: [
        { input: "()", expectedOutput: "true", isHidden: false },
        { input: "()[]{}", expectedOutput: "true", isHidden: false },
        { input: "(]", expectedOutput: "false", isHidden: true },
        { input: "{[()]}", expectedOutput: "true", isHidden: true },
      ],
      starterCode: {
        javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
    // Your solution here
};`,
        python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Your solution here
        pass`,
        java: `class Solution {
    public boolean isValid(String s) {
        // Your solution here
    }
}`,
        cpp: `class Solution {
public:
    bool isValid(string s) {
        // Your solution here
    }
};`,
      },
      hints: ["Use a stack data structure."],
    },
  });

  const problem3 = await prisma.problem.upsert({
    where: { slug: "longest-substring-without-repeating" },
    update: {},
    create: {
      title: "Longest Substring Without Repeating Characters",
      slug: "longest-substring-without-repeating",
      description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
      difficulty: Difficulty.MEDIUM,
      points: 20,
      timeLimit: 2000,
      memoryLimit: 256,
      isPublished: true,
      createdById: teacher.id,
      constraints: `- 0 <= s.length <= 5 * 10^4\n- s consists of English letters, digits, symbols and spaces.`,
      examples: [
        {
          input: 's = "abcabcbb"',
          output: "3",
          explanation: 'The answer is "abc", with the length of 3.',
        },
        {
          input: 's = "bbbbb"',
          output: "1",
          explanation: 'The answer is "b", with the length of 1.',
        },
        {
          input: 's = "pwwkew"',
          output: "3",
          explanation: 'The answer is "wke", with the length of 3.',
        },
      ],
      testCases: [
        { input: "abcabcbb", expectedOutput: "3", isHidden: false },
        { input: "bbbbb", expectedOutput: "1", isHidden: false },
        { input: "pwwkew", expectedOutput: "3", isHidden: true },
        { input: "", expectedOutput: "0", isHidden: true },
      ],
      starterCode: {
        javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
    // Your solution here
};`,
        python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Your solution here
        pass`,
        java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your solution here
    }
}`,
        cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Your solution here
    }
};`,
      },
      hints: ["Try the sliding window approach."],
    },
  });

  // Tag problems
  await prisma.problemTag.createMany({
    data: [
      { problemId: problem1.id, tagId: tags[0].id },
      { problemId: problem1.id, tagId: tags[1].id },
      { problemId: problem2.id, tagId: tags[5].id },
      { problemId: problem3.id, tagId: tags[5].id },
      { problemId: problem3.id, tagId: tags[1].id },
    ],
    skipDuplicates: true,
  });

  // Create a contest
  const now = new Date();
  const contest = await prisma.contest.create({
    data: {
      title: "Week 1 Assessment",
      description:
        "First week programming assessment covering arrays and strings.",
      startsAt: new Date(now.getTime() + 1000 * 60 * 60), // 1 hour from now
      endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 3), // 3 hours from now
      isPublic: true,
      createdById: teacher.id,
      problems: {
        create: [
          { problemId: problem1.id, orderIndex: 0 },
          { problemId: problem2.id, orderIndex: 1 },
          { problemId: problem3.id, orderIndex: 2 },
        ],
      },
    },
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("🔐 Test accounts:");
  console.log("  Admin:   admin@university.edu   / admin123");
  console.log("  Teacher: teacher@university.edu / teacher123");
  console.log("  Student: alice@university.edu   / student123");
  console.log("  Student: bob@university.edu     / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
