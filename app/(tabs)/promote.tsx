import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Video, 
  Coins, 
  Eye, 
  Clock, 
  ChevronDown, 
  Play,
  Menu,
  ExternalLink,
  Plus,
  TrendingUp,
  BarChart3,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit3,
  Pause,
  RotateCcw,
  Timer,
  DollarSign,
  Target,
  Activity,
  Users,
  Globe,
  Zap,
  Star,
  Award,
  Gift,
  Crown,
  Shield,
  Sparkles,
  Flame,
  Rocket,
  Diamond,
  Heart,
  ThumbsUp,
  Share2,
  Bookmark,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Link,
  Camera,
  Image,
  FileText,
  Download,
  Upload,
  Save,
  Copy,
  Cut,
  Paste,
  Undo,
  Redo,
  Refresh,
  Maximize,
  Minimize,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Home,
  User,
  Bell,
  MessageCircle,
  ShoppingCart,
  CreditCard,
  Wallet,
  PieChart,
  LineChart,
  TrendingDown,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Bluetooth,
  Headphones,
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Desktop,
  Server,
  Database,
  Cloud,
  CloudOff,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  EyeOff,
  Visibility,
  VisibilityOff,
  Security,
  PrivacyTip,
  Verified,
  Warning,
  Error,
  Success,
  Pending,
  Loading,
  Sync,
  SyncOff,
  Update,
  Upgrade,
  Downgrade,
  Install,
  Uninstall,
  Configure,
  Customize,
  Personalize,
  Theme,
  Palette,
  Brush,
  ColorLens,
  FormatPaint,
  Style,
  Design,
  Layout,
  Grid,
  List,
  Card,
  Table,
  Chart,
  Graph,
  Analytics,
  Report,
  Dashboard,
  Metrics,
  Statistics,
  Data,
  Insights,
  Intelligence,
  Machine,
  Robot,
  Automation,
  Workflow,
  Process,
  Pipeline,
  Integration,
  API,
  Code,
  Terminal,
  Console,
  Debug,
  Test,
  Build,
  Deploy,
  Release,
  Version,
  Branch,
  Merge,
  Commit,
  Push,
  Pull,
  Clone,
  Fork,
  Repository,
  Package,
  Library,
  Framework,
  SDK,
  Plugin,
  Extension,
  Module,
  Component,
  Widget,
  Tool,
  Utility,
  Helper,
  Service,
  Function,
  Method,
  Class,
  Object,
  Variable,
  Constant,
  Parameter,
  Argument,
  Return,
  Import,
  Export,
  Include,
  Require,
  Load,
  Execute,
  Run,
  Start,
  Stop,
  Restart,
  Resume,
  Suspend,
  Cancel,
  Abort,
  Exit,
  Quit,
  Close,
  Open,
  Create,
  New,
  Add,
  Insert,
  Append,
  Prepend,
  Remove,
  Delete,
  Clear,
  Reset,
  Restore,
  Backup,
  Archive,
  Compress,
  Extract,
  Encrypt,
  Decrypt,
  Hash,
  Sign,
  Verify,
  Validate,
  Authenticate,
  Authorize,
  Permission,
  Role,
  Group,
  Team,
  Organization,
  Company,
  Business,
  Enterprise,
  Corporate,
  Professional,
  Personal,
  Individual,
  Customer,
  Client,
  Vendor,
  Supplier,
  Partner,
  Affiliate,
  Sponsor,
  Investor,
  Stakeholder,
  Shareholder,
  Owner,
  Manager,
  Administrator,
  Moderator,
  Editor,
  Author,
  Contributor,
  Reviewer,
  Approver,
  Publisher,
  Subscriber,
  Follower,
  Friend,
  Contact,
  Connection,
  Network,
  Community,
  Social,
  Public,
  Private,
  Internal,
  External,
  Local,
  Remote,
  Global,
  Regional,
  National,
  International,
  Worldwide,
  Universal,
  General,
  Specific,
  Detailed,
  Summary,
  Overview,
  Introduction,
  Conclusion,
  Beginning,
  Middle,
  End,
  First,
  Last,
  Previous,
  Next,
  Current,
  Latest,
  Recent,
  Old,
  New,
  Fresh,
  Updated,
  Modified,
  Changed,
  Improved,
  Enhanced,
  Optimized,
  Refined,
  Polished,
  Finished,
  Complete,
  Incomplete,
  Partial,
  Full,
  Empty,
  Filled,
  Available,
  Unavailable,
  Online,
  Offline,
  Connected,
  Disconnected,
  Active,
  Inactive,
  Enabled,
  Disabled,
  Visible,
  Hidden,
  Shown,
  Collapsed,
  Expanded,
  Minimized,
  Maximized,
  Focused,
  Blurred,
  Selected,
  Unselected,
  Checked,
  Unchecked,
  Marked,
  Unmarked,
  Tagged,
  Untagged,
  Labeled,
  Unlabeled,
  Named,
  Unnamed,
  Titled,
  Untitled,
  Described,
  Undescribed,
  Documented,
  Undocumented,
  Explained,
  Unexplained,
  Clarified,
  Unclear,
  Obvious,
  Obscure,
  Simple,
  Complex,
  Easy,
  Difficult,
  Hard,
  Soft,
  Smooth,
  Rough,
  Sharp,
  Blunt,
  Bright,
  Dark,
  Light,
  Heavy,
  Fast,
  Slow,
  Quick,
  Delayed,
  Instant,
  Immediate,
  Gradual,
  Sudden,
  Smooth,
  Abrupt,
  Gentle,
  Harsh,
  Mild,
  Severe,
  Critical,
  Important,
  Urgent,
  Priority,
  Optional,
  Required,
  Mandatory,
  Forbidden,
  Allowed,
  Permitted,
  Restricted,
  Limited,
  Unlimited,
  Infinite,
  Finite,
  Bounded,
  Unbounded,
  Constrained,
  Unconstrained,
  Fixed,
  Variable,
  Static,
  Dynamic,
  Flexible,
  Rigid,
  Stable,
  Unstable,
  Reliable,
  Unreliable,
  Consistent,
  Inconsistent,
  Predictable,
  Unpredictable,
  Expected,
  Unexpected,
  Normal,
  Abnormal,
  Regular,
  Irregular,
  Standard,
  Custom,
  Default,
  Alternative,
  Primary,
  Secondary,
  Tertiary,
  Main,
  Sub,
  Parent,
  Child,
  Root,
  Leaf,
  Branch,
  Node,
  Edge,
  Connection,
  Link,
  Relationship,
  Association,
  Dependency,
  Reference,
  Pointer,
  Address,
  Location,
  Position,
  Coordinate,
  Point,
  Line,
  Curve,
  Shape,
  Form,
  Structure,
  Pattern,
  Template,
  Model,
  Schema,
  Format,
  Type,
  Kind,
  Category,
  Class,
  Group,
  Set,
  Collection,
  Array,
  List,
  Queue,
  Stack,
  Tree,
  Graph,
  Network,
  Mesh,
  Grid,
  Matrix,
  Vector,
  Scalar,
  Number,
  Integer,
  Float,
  Double,
  Decimal,
  Fraction,
  Percentage,
  Ratio,
  Rate,
  Speed,
  Velocity,
  Acceleration,
  Force,
  Power,
  Energy,
  Work,
  Effort,
  Task,
  Job,
  Assignment,
  Project,
  Mission,
  Goal,
  Objective,
  Target,
  Aim,
  Purpose,
  Intent,
  Intention,
  Plan,
  Strategy,
  Tactic,
  Approach,
  Method,
  Technique,
  Procedure,
  Process,
  Algorithm,
  Formula,
  Equation,
  Expression,
  Statement,
  Declaration,
  Definition,
  Description,
  Explanation,
  Instruction,
  Direction,
  Guide,
  Manual,
  Documentation,
  Specification,
  Requirement,
  Constraint,
  Rule,
  Policy,
  Guideline,
  Standard,
  Protocol,
  Convention,
  Practice,
  Habit,
  Routine,
  Custom,
  Tradition,
  Culture,
  Style,
  Fashion,
  Trend,
  Movement,
  Change,
  Transformation,
  Evolution,
  Development,
  Growth,
  Progress,
  Advancement,
  Improvement,
  Enhancement,
  Upgrade,
  Update,
  Revision,
  Modification,
  Adjustment,
  Correction,
  Fix,
  Repair,
  Maintenance,
  Support,
  Help,
  Assistance,
  Aid,
  Service,
  Care,
  Attention,
  Focus,
  Concentration,
  Dedication,
  Commitment,
  Loyalty,
  Trust,
  Faith,
  Belief,
  Confidence,
  Hope,
  Expectation,
  Anticipation,
  Prediction,
  Forecast,
  Estimate,
  Calculation,
  Computation,
  Analysis,
  Evaluation,
  Assessment,
  Review,
  Audit,
  Inspection,
  Examination,
  Investigation,
  Research,
  Study,
  Survey,
  Poll,
  Vote,
  Election,
  Selection,
  Choice,
  Option,
  Alternative,
  Possibility,
  Opportunity,
  Chance,
  Risk,
  Threat,
  Danger,
  Safety,
  Security,
  Protection,
  Defense,
  Guard,
  Shield,
  Barrier,
  Wall,
  Fence,
  Gate,
  Door,
  Window,
  Opening,
  Entrance,
  Exit,
  Path,
  Route,
  Way,
  Road,
  Street,
  Avenue,
  Boulevard,
  Highway,
  Bridge,
  Tunnel,
  Passage,
  Corridor,
  Hall,
  Room,
  Space,
  Area,
  Zone,
  Region,
  Territory,
  Domain,
  Realm,
  Kingdom,
  Empire,
  Nation,
  Country,
  State,
  Province,
  City,
  Town,
  Village,
  Neighborhood,
  District,
  Quarter,
  Block,
  Building,
  Structure,
  Construction,
  Architecture,
  Design,
  Blueprint,
  Plan,
  Sketch,
  Drawing,
  Diagram,
  Chart,
  Map,
  Guide,
  Reference,
  Index,
  Catalog,
  Directory,
  Registry,
  Database,
  Repository,
  Archive,
  Library,
  Collection,
  Museum,
  Gallery,
  Exhibition,
  Display,
  Show,
  Presentation,
  Performance,
  Event,
  Occasion,
  Ceremony,
  Celebration,
  Festival,
  Party,
  Gathering,
  Meeting,
  Conference,
  Summit,
  Convention,
  Symposium,
  Workshop,
  Seminar,
  Training,
  Course,
  Class,
  Lesson,
  Tutorial,
  Guide,
  Manual,
  Handbook,
  Textbook,
  Book,
  Publication,
  Document,
  Paper,
  Article,
  Essay,
  Report,
  Study,
  Research,
  Analysis,
  Review,
  Critique,
  Commentary,
  Opinion,
  Viewpoint,
  Perspective,
  Angle,
  Approach,
  Method,
  Way,
  Manner,
  Style,
  Fashion,
  Mode,
  Form,
  Format,
  Structure,
  Organization,
  Arrangement,
  Order,
  Sequence,
  Series,
  Chain,
  Link,
  Connection,
  Relationship,
  Bond,
  Tie,
  Association,
  Partnership,
  Alliance,
  Union,
  Merger,
  Combination,
  Integration,
  Synthesis,
  Fusion,
  Blend,
  Mix,
  Mixture,
  Compound,
  Element,
  Component,
  Part,
  Piece,
  Fragment,
  Section,
  Segment,
  Division,
  Department,
  Unit,
  Module,
  Block,
  Chunk,
  Portion,
  Share,
  Fraction,
  Percentage,
  Proportion,
  Ratio,
  Rate,
  Measure,
  Metric,
  Standard,
  Benchmark,
  Baseline,
  Reference,
  Comparison,
  Contrast,
  Difference,
  Distinction,
  Variation,
  Change,
  Modification,
  Alteration,
  Adjustment,
  Adaptation,
  Customization,
  Personalization,
  Configuration,
  Setup,
  Installation,
  Deployment,
  Implementation,
  Execution,
  Operation,
  Function,
  Feature,
  Capability,
  Ability,
  Skill,
  Talent,
  Gift,
  Strength,
  Power,
  Force,
  Energy,
  Vitality,
  Life,
  Existence,
  Being,
  Entity,
  Object,
  Thing,
  Item,
  Article,
  Product,
  Good,
  Service,
  Offering,
  Solution,
  Answer,
  Response,
  Reply,
  Feedback,
  Input,
  Output,
  Result,
  Outcome,
  Consequence,
  Effect,
  Impact,
  Influence,
  Affect,
  Change,
  Transform,
  Convert,
  Translate,
  Interpret,
  Understand,
  Comprehend,
  Grasp,
  Realize,
  Recognize,
  Identify,
  Discover,
  Find,
  Locate,
  Search,
  Seek,
  Look,
  See,
  View,
  Watch,
  Observe,
  Monitor,
  Track,
  Follow,
  Trace,
  Record,
  Log,
  Document,
  Note,
  Write,
  Type,
  Enter,
  Input,
  Submit,
  Send,
  Transmit,
  Transfer,
  Move,
  Shift,
  Transport,
  Carry,
  Deliver,
  Provide,
  Supply,
  Offer,
  Give,
  Grant,
  Award,
  Present,
  Show,
  Display,
  Exhibit,
  Demonstrate,
  Prove,
  Confirm,
  Verify,
  Validate,
  Check,
  Test,
  Try,
  Attempt,
  Effort,
  Work,
  Labor,
  Task,
  Job,
  Duty,
  Responsibility,
  Obligation,
  Commitment,
  Promise,
  Agreement,
  Contract,
  Deal,
  Arrangement,
  Plan,
  Scheme,
  Strategy,
  Approach,
  Method,
  Technique,
  Procedure,
  Process,
  System,
  Mechanism,
  Device,
  Tool,
  Instrument,
  Equipment,
  Machine,
  Apparatus,
  Gadget,
  Widget,
  Component,
  Part,
  Element,
  Factor,
  Aspect,
  Feature,
  Characteristic,
  Property,
  Attribute,
  Quality,
  Trait,
  Nature,
  Essence,
  Core,
  Heart,
  Center,
  Middle,
  Focus,
  Point,
  Spot,
  Place,
  Location,
  Position,
  Site,
  Area,
  Zone,
  Region,
  Territory,
  Domain,
  Field,
  Scope,
  Range,
  Extent,
  Limit,
  Boundary,
  Border,
  Edge,
  Margin,
  Frame,
  Container,
  Wrapper,
  Package,
  Bundle,
  Set,
  Kit,
  Collection,
  Group,
  Team,
  Squad,
  Crew,
  Staff,
  Personnel,
  People,
  Individuals,
  Persons,
  Humans,
  Beings,
  Entities,
  Objects,
  Things,
  Items,
  Elements,
  Components,
  Parts,
  Pieces,
  Fragments,
  Bits,
  Chunks,
  Blocks,
  Units,
  Modules,
  Sections,
  Segments,
  Divisions,
  Categories,
  Classes,
  Types,
  Kinds,
  Sorts,
  Varieties,
  Forms,
  Shapes,
  Structures,
  Patterns,
  Designs,
  Layouts,
  Arrangements,
  Organizations,
  Systems,
  Networks,
  Connections,
  Links,
  Relationships,
  Associations,
  Partnerships,
  Alliances,
  Unions,
  Mergers,
  Combinations,
  Integrations,
  Syntheses,
  Fusions,
  Blends,
  Mixes,
  Mixtures,
  Compounds,
  Solutions,
  Answers,
  Responses,
  Results,
  Outcomes,
  Consequences,
  Effects,
  Impacts,
  Influences,
  Changes,
  Transformations,
  Modifications,
  Alterations,
  Adjustments,
  Adaptations,
  Customizations,
  Personalizations,
  Configurations,
  Settings,
  Options,
  Preferences,
  Choices,
  Selections,
  Decisions,
  Determinations,
  Resolutions,
  Conclusions,
  Endings,
  Finishes,
  Completions,
  Accomplishments,
  Achievements,
  Successes,
  Victories,
  Wins,
  Triumphs,
  Conquests,
  Defeats,
  Losses,
  Failures,
  Mistakes,
  Errors,
  Faults,
  Flaws,
  Defects,
  Problems,
  Issues,
  Challenges,
  Difficulties,
  Obstacles,
  Barriers,
  Hurdles,
  Impediments,
  Hindrances,
  Restrictions,
  Limitations,
  Constraints,
  Boundaries,
  Limits,
  Extents,
  Ranges,
  Scopes,
  Fields,
  Domains,
  Areas,
  Zones,
  Regions,
  Territories,
  Spaces,
  Places,
  Locations,
  Positions,
  Sites,
  Spots,
  Points,
  Coordinates,
  Addresses,
  References,
  Pointers,
  Indicators,
  Markers,
  Signs,
  Symbols,
  Icons,
  Images,
  Pictures,
  Graphics,
  Visuals,
  Displays,
  Screens,
  Monitors,
  Devices,
  Gadgets,
  Tools,
  Instruments,
  Equipment,
  Machines,
  Apparatus,
  Systems,
  Mechanisms,
  Processes,
  Procedures,
  Methods,
  Techniques,
  Approaches,
  Strategies,
  Plans,
  Schemes,
  Programs,
  Projects,
  Initiatives,
  Campaigns,
  Operations,
  Activities,
  Actions,
  Tasks,
  Jobs,
  Works,
  Efforts,
  Attempts,
  Tries,
  Tests,
  Experiments,
  Trials,
  Studies,
  Researches,
  Investigations,
  Examinations,
  Inspections,
  Reviews,
  Audits,
  Assessments,
  Evaluations,
  Analyses,
  Calculations,
  Computations,
  Measurements,
  Metrics,
  Statistics,
  Data,
  Information,
  Knowledge,
  Wisdom,
  Understanding,
  Comprehension,
  Insight,
  Intelligence,
  Awareness,
  Consciousness,
  Perception,
  Recognition,
  Realization,
  Discovery,
  Finding,
  Detection,
  Identification,
  Classification,
  Categorization,
  Organization,
  Arrangement,
  Structure,
  Order,
  Sequence,
  Series,
  Chain,
  Flow,
  Stream,
  Current,
  Movement,
  Motion,
  Action,
  Activity,
  Operation,
  Function,
  Performance,
  Execution,
  Implementation,
  Deployment,
  Installation,
  Setup,
  Configuration,
  Customization,
  Personalization,
  Adaptation,
  Modification,
  Alteration,
  Change,
  Transformation,
  Evolution,
  Development,
  Growth,
  Progress,
  Advancement,
  Improvement,
  Enhancement,
  Optimization,
  Refinement,
  Polish,
  Finish,
  Completion,
  Achievement,
  Success,
  Victory,
  Win,
  Triumph,
  Conquest,
  Accomplishment,
  Attainment,
  Realization,
  Fulfillment,
  Satisfaction,
  Contentment,
  Happiness,
  Joy,
  Pleasure,
  Delight,
  Enjoyment,
  Fun,
  Entertainment,
  Amusement,
  Recreation,
  Relaxation,
  Rest,
  Peace,
  Calm,
  Quiet,
  Silence,
  Stillness,
  Tranquility,
  Serenity,
  Harmony,
  Balance,
  Equilibrium,
  Stability,
  Consistency,
  Reliability,
  Dependability,
  Trustworthiness,
  Credibility,
  Authenticity,
  Genuineness,
  Sincerity,
  Honesty,
  Integrity,
  Ethics,
  Morality,
  Values,
  Principles,
  Beliefs,
  Convictions,
  Opinions,
  Views,
  Perspectives,
  Viewpoints,
  Standpoints,
  Positions,
  Stances,
  Attitudes,
  Approaches,
  Orientations,
  Directions,
  Paths,
  Routes,
  Ways,
  Methods,
  Means,
  Modes,
  Manners,
  Styles,
  Fashions,
  Trends,
  Patterns,
  Habits,
  Customs,
  Traditions,
  Practices,
  Procedures,
  Protocols,
  Standards,
  Guidelines,
  Rules,
  Regulations,
  Laws,
  Policies,
  Requirements,
  Specifications,
  Criteria,
  Conditions,
  Terms,
  Provisions,
  Clauses,
  Sections,
  Articles,
  Paragraphs,
  Sentences,
  Phrases,
  Words,
  Terms,
  Expressions,
  Statements,
  Declarations,
  Announcements,
  Proclamations,
  Notifications,
  Alerts,
  Warnings,
  Messages,
  Communications,
  Transmissions,
  Signals,
  Indications,
  Signs,
  Symptoms,
  Evidence,
  Proof,
  Confirmation,
  Verification,
  Validation,
  Authentication,
  Authorization,
  Permission,
  Approval,
  Consent,
  Agreement,
  Acceptance,
  Acknowledgment,
  Recognition,
  Appreciation,
  Gratitude,
  Thanks,
  Praise,
  Compliment,
  Commendation,
  Recommendation,
  Endorsement,
  Support,
  Backing,
  Assistance,
  Help,
  Aid,
  Service,
  Care,
  Attention,
  Consideration,
  Respect,
  Regard,
  Esteem,
  Honor,
  Dignity,
  Worth,
  Value,
  Importance,
  Significance,
  Relevance,
  Meaning,
  Purpose,
  Intent,
  Intention,
  Goal,
  Objective,
  Target,
  Aim,
  Mission,
  Vision,
  Dream,
  Hope,
  Wish,
  Desire,
  Want,
  Need,
  Requirement,
  Necessity,
  Essential,
  Fundamental,
  Basic,
  Primary,
  Main,
  Principal,
  Chief,
  Leading,
  Top,
  Best,
  Excellent,
  Outstanding,
  Superior,
  Premium,
  Quality,
  High,
  Great,
  Good,
  Fine,
  Nice,
  Pleasant,
  Enjoyable,
  Satisfying,
  Fulfilling,
  Rewarding,
  Beneficial,
  Useful,
  Helpful,
  Valuable,
  Worthwhile,
  Meaningful,
  Significant,
  Important,
  Relevant,
  Applicable,
  Suitable,
  Appropriate,
  Proper,
  Correct,
  Right,
  Accurate,
  Precise,
  Exact,
  Perfect,
  Ideal,
  Optimal,
  Best,
  Ultimate,
  Final,
  Last,
  End,
  Conclusion,
  Finish,
  Completion,
  Achievement,
  Success
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

interface PromotedVideo {
  id: string;
  youtube_url: string;
  title: string;
  views_count: number;
  target_views: number;
  coin_reward: number;
  coin_cost: number;
  status: 'active' | 'paused' | 'completed' | 'on_hold';
  created_at: string;
  updated_at: string;
  hold_until?: string;
  duration_seconds: number;
}

interface VideoStats {
  totalPromoted: number;
  totalViews: number;
  totalSpent: number;
  activeVideos: number;
  completedVideos: number;
  pendingVideos: number;
}

export default function PromoteTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [promotedVideos, setPromotedVideos] = useState<PromotedVideo[]>([]);
  const [videoStats, setVideoStats] = useState<VideoStats>({
    totalPromoted: 0,
    totalViews: 0,
    totalSpent: 0,
    activeVideos: 0,
    completedVideos: 0,
    pendingVideos: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showPromotionForm, setShowPromotionForm] = useState(true);
  const [showVideoList, setShowVideoList] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'on_hold' | 'paused'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'views' | 'cost'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<PromotedVideo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [holdTimers, setHoldTimers] = useState<{[key: string]: number}>({});

  // Animation values
  const coinBounce = useSharedValue(1);
  const statsScale = useSharedValue(1);
  const formSlide = useSharedValue(0);

  // Auto-refresh and real-time updates
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchPromotedVideos();
        const interval = setInterval(() => {
          updateHoldTimers();
          checkVideoHoldStatus();
        }, 30000); // Check every 30 seconds
        
        return () => clearInterval(interval);
      }
    }, [user])
  );

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // If it's already just an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
      /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const fetchVideoTitle = async (videoId: string) => {
    try {
      // For demo purposes, we'll use a placeholder title
      // In production, you'd use YouTube API to fetch the actual title
      setVideoTitle(`Video ${videoId.substring(0, 8)}`);
    } catch (error) {
      console.error('Error fetching video title:', error);
      setVideoTitle('YouTube Video');
    }
  };

  const fetchPromotedVideos = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      // Fetch promoted videos
      const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPromotedVideos(videos || []);

      // Calculate stats
      const stats: VideoStats = {
        totalPromoted: videos?.length || 0,
        totalViews: videos?.reduce((sum, v) => sum + v.views_count, 0) || 0,
        totalSpent: videos?.reduce((sum, v) => sum + v.coin_cost, 0) || 0,
        activeVideos: videos?.filter(v => v.status === 'active').length || 0,
        completedVideos: videos?.filter(v => v.status === 'completed').length || 0,
        pendingVideos: videos?.filter(v => v.status === 'on_hold').length || 0,
      };
      setVideoStats(stats);

      // Update hold timers for videos on hold
      const holdVideos = videos?.filter(v => v.status === 'on_hold') || [];
      const newHoldTimers: {[key: string]: number} = {};
      holdVideos.forEach(video => {
        const holdUntil = new Date(video.hold_until || video.created_at);
        holdUntil.setMinutes(holdUntil.getMinutes() + 10);
        const remainingMs = holdUntil.getTime() - new Date().getTime();
        newHoldTimers[video.id] = Math.max(0, Math.floor(remainingMs / 1000));
      });
      setHoldTimers(newHoldTimers);

    } catch (error) {
      console.error('Error fetching promoted videos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const checkVideoHoldStatus = async () => {
    if (!user) return;

    try {
      // Call the database function to release videos from hold
      const { data, error } = await supabase.rpc('release_videos_from_hold');
      
      if (error) throw error;
      
      if (data > 0) {
        console.log(`Released ${data} videos from hold to queue`);
        // Refresh videos to show updated status
        fetchPromotedVideos();
      }
    } catch (error) {
      console.error('Error checking video hold status:', error);
    }
  };

  const updateHoldTimers = () => {
    setHoldTimers(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      Object.keys(updated).forEach(videoId => {
        if (updated[videoId] > 0) {
          updated[videoId] -= 30; // Decrease by 30 seconds
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  };

  useEffect(() => {
    const videoId = extractVideoId(youtubeUrl);
    if (videoId) {
      fetchVideoTitle(videoId);
    } else {
      setVideoTitle('');
    }
  }, [youtubeUrl]);

  const calculateCoinCost = (views: number, duration: number) => {
    // Base cost calculation: views * duration factor
    const durationFactor = duration / 30; // 30 seconds as base
    return Math.ceil(views * durationFactor * 2); // 2 coins per view-duration unit
  };

  const coinCost = calculateCoinCost(selectedViews, selectedDuration);

  const handlePromoteVideo = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to promote videos');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube URL or video ID');
      return;
    }

    if ((profile?.coins || 0) < coinCost) {
      Alert.alert('Insufficient Coins', `You need 🪙${coinCost} coins to promote this video.`);
      return;
    }

    setLoading(true);

    try {
      // Check if video already exists
      const { data: existingVideo, error: checkError } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_url', videoId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVideo) {
        Alert.alert('Video Already Promoted', 'This video is already in your promotion list.');
        setLoading(false);
        return;
      }

      // Deduct coins first
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Promoted video: ${videoTitle || videoId}`,
          reference_uuid: null
        });

      if (coinError) throw coinError;

      // Create video with 10-minute hold
      const holdUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const { error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          youtube_url: videoId,
          title: videoTitle || `YouTube Video ${videoId.substring(0, 8)}`,
          description: '',
          duration_seconds: selectedDuration,
          coin_cost: coinCost,
          coin_reward: 3, // Fixed reward per view
          target_views: selectedViews,
          status: 'on_hold',
          hold_until: holdUntil.toISOString(),
          views_count: 0
        });

      if (videoError) throw videoError;

      // Refresh profile and videos
      await refreshProfile();
      await fetchPromotedVideos();

      // Animate coin update
      coinBounce.value = withSequence(
        withSpring(0.8, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      // Animate stats
      statsScale.value = withSequence(
        withSpring(1.05, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );

      Alert.alert(
        'Video Promoted Successfully!',
        `Your video is now on hold for 10 minutes before entering the queue. Cost: 🪙${coinCost}`,
        [{ text: 'OK' }]
      );

      // Reset form
      setYoutubeUrl('');
      setVideoTitle('');
      setSelectedViews(50);
      setSelectedDuration(30);

    } catch (error: any) {
      console.error('Error promoting video:', error);
      Alert.alert('Error', 'Failed to promote video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoAction = (video: PromotedVideo, action: 'edit' | 'delete' | 'pause' | 'resume') => {
    setSelectedVideo(video);
    
    switch (action) {
      case 'edit':
        // Navigate to edit screen
        break;
      case 'delete':
        handleDeleteVideo(video);
        break;
      case 'pause':
        handlePauseVideo(video);
        break;
      case 'resume':
        handleResumeVideo(video);
        break;
    }
  };

  const handleDeleteVideo = async (video: PromotedVideo) => {
    const minutesSinceCreation = Math.floor(
      (new Date().getTime() - new Date(video.created_at).getTime()) / (1000 * 60)
    );
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 80;
    const refundAmount = Math.floor(video.coin_cost * refundPercentage / 100);

    Alert.alert(
      'Delete Video',
      `Deleting now refunds ${refundPercentage}% coins (🪙${refundAmount}). Confirm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the video
              const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id)
                .eq('user_id', user.id);

              if (deleteError) throw deleteError;

              // Process refund
              if (refundAmount > 0) {
                const { error: refundError } = await supabase
                  .rpc('update_user_coins', {
                    user_uuid: user.id,
                    coin_amount: refundAmount,
                    transaction_type_param: 'admin_adjustment',
                    description_param: `Refund for deleted video: ${video.title} (${refundPercentage}%)`,
                    reference_uuid: video.id
                  });

                if (refundError) throw refundError;
              }

              // Refresh data
              await refreshProfile();
              await fetchPromotedVideos();

              Alert.alert('Success', `Video deleted and 🪙${refundAmount} coins refunded!`);
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handlePauseVideo = async (video: PromotedVideo) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', video.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchPromotedVideos();
      Alert.alert('Success', 'Video paused successfully');
    } catch (error) {
      console.error('Error pausing video:', error);
      Alert.alert('Error', 'Failed to pause video');
    }
  };

  const handleResumeVideo = async (video: PromotedVideo) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', video.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchPromotedVideos();
      Alert.alert('Success', 'Video resumed successfully');
    } catch (error) {
      console.error('Error resuming video:', error);
      Alert.alert('Error', 'Failed to resume video');
    }
  };

  const getFilteredAndSortedVideos = () => {
    let filtered = promotedVideos;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(video => video.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.youtube_url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'views':
        filtered.sort((a, b) => b.views_count - a.views_count);
        break;
      case 'cost':
        filtered.sort((a, b) => b.coin_cost - a.coin_cost);
        break;
    }

    return filtered;
  };

  const formatHoldTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      case 'on_hold': return 'PENDING';
      default: return status.toUpperCase();
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formSlide.value }],
  }));

  const filteredVideos = getFilteredAndSortedVideos();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF4757', '#FF6B8A']}
        style={styles.header}
      >
        <Menu color="white" size={24} />
        <Text style={styles.headerTitle}>Promote</Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Coins color="#FFD700" size={isSmallScreen ? 18 : 20} />
          <Text style={styles.coinCount}>{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPromotedVideos(true)}
            tintColor="#FF4757"
            colors={['#FF4757']}
          />
        }
      >
        {/* Stats Section */}
        {showStats && (
          <Animated.View style={[styles.statsSection, statsAnimatedStyle]}>
            <View style={styles.statsHeader}>
              <Text style={styles.sectionTitle}>Your Statistics</Text>
              <TouchableOpacity onPress={() => setShowStats(false)}>
                <X color="#666" size={20} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Video color="#FF4757" size={20} />
                </View>
                <Text style={styles.statValue}>{videoStats.totalPromoted}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Eye color="#3498DB" size={20} />
                </View>
                <Text style={styles.statValue}>{videoStats.totalViews}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Coins color="#FFA726" size={20} />
                </View>
                <Text style={styles.statValue}>{videoStats.totalSpent}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
            </View>

            <View style={styles.statusBreakdown}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#2ECC71' }]} />
                <Text style={styles.statusText}>{videoStats.activeVideos} Active</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#F39C12' }]} />
                <Text style={styles.statusText}>{videoStats.pendingVideos} Pending</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#3498DB' }]} />
                <Text style={styles.statusText}>{videoStats.completedVideos} Completed</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Promotion Form */}
        {showPromotionForm && (
          <Animated.View style={[styles.formSection, formAnimatedStyle]}>
            <View style={styles.formHeader}>
              <Text style={styles.sectionTitle}>Promote New Video</Text>
              <TouchableOpacity onPress={() => setShowPromotionForm(false)}>
                <X color="#666" size={20} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formCard}>
              {/* YouTube URL Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>YouTube URL or Video ID</Text>
                <View style={styles.inputContainer}>
                  <Video color="#FF4757" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="https://youtube.com/watch?v=... or video ID"
                    placeholderTextColor="#999"
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {youtubeUrl && (
                    <TouchableOpacity
                      style={styles.externalLink}
                      onPress={() => {
                        const videoId = extractVideoId(youtubeUrl);
                        if (videoId && Platform.OS === 'web') {
                          window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                        }
                      }}
                    >
                      <ExternalLink color="#666" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
                {videoTitle && (
                  <Text style={styles.videoPreview}>📹 {videoTitle}</Text>
                )}
              </View>

              {/* Target Views Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Views</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowViewsDropdown(!showViewsDropdown)}
                >
                  <Eye color="#3498DB" size={20} />
                  <Text style={styles.dropdownText}>{selectedViews} views</Text>
                  <ChevronDown 
                    color="#666" 
                    size={20} 
                    style={[
                      styles.chevron,
                      showViewsDropdown && styles.chevronRotated
                    ]}
                  />
                </TouchableOpacity>
                
                {showViewsDropdown && (
                  <View style={styles.dropdownMenu}>
                    {VIEW_OPTIONS.map((views) => (
                      <TouchableOpacity
                        key={views}
                        style={[
                          styles.dropdownItem,
                          selectedViews === views && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedViews(views);
                          setShowViewsDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedViews === views && styles.dropdownItemTextSelected
                        ]}>
                          {views} views
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Watch Duration Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Required Watch Duration</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => setShowDurationDropdown(!showDurationDropdown)}
                >
                  <Clock color="#F39C12" size={20} />
                  <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
                  <ChevronDown 
                    color="#666" 
                    size={20} 
                    style={[
                      styles.chevron,
                      showDurationDropdown && styles.chevronRotated
                    ]}
                  />
                </TouchableOpacity>
                
                {showDurationDropdown && (
                  <View style={styles.dropdownMenu}>
                    {DURATION_OPTIONS.map((duration) => (
                      <TouchableOpacity
                        key={duration}
                        style={[
                          styles.dropdownItem,
                          selectedDuration === duration && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedDuration(duration);
                          setShowDurationDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedDuration === duration && styles.dropdownItemTextSelected
                        ]}>
                          {duration} seconds
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Cost Summary */}
              <View style={styles.costSummary}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Total Cost:</Text>
                  <Text style={styles.costValue}>🪙{coinCost}</Text>
                </View>
                <Text style={styles.costDescription}>
                  {selectedViews} views × {selectedDuration}s duration
                </Text>
              </View>

              {/* Promote Button */}
              <TouchableOpacity
                style={[
                  styles.promoteButton,
                  (!youtubeUrl || loading || (profile?.coins || 0) < coinCost) && styles.promoteButtonDisabled
                ]}
                onPress={handlePromoteVideo}
                disabled={!youtubeUrl || loading || (profile?.coins || 0) < coinCost}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Play color="white" size={20} />
                )}
                <Text style={styles.promoteButtonText}>
                  {loading ? 'Promoting...' : 'Promote Video'}
                </Text>
              </TouchableOpacity>

              {(profile?.coins || 0) < coinCost && (
                <Text style={styles.insufficientFunds}>
                  Insufficient coins. You need 🪙{coinCost - (profile?.coins || 0)} more.
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Video List Section */}
        {showVideoList && (
          <View style={styles.videoListSection}>
            <View style={styles.videoListHeader}>
              <Text style={styles.sectionTitle}>Your Promoted Videos</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Filter color="#666" size={16} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowVideoList(false)}>
                  <X color="#666" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters */}
            {showFilters && (
              <View style={styles.filtersContainer}>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Status:</Text>
                  <View style={styles.filterOptions}>
                    {['all', 'active', 'on_hold', 'completed', 'paused'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.filterChip,
                          filterStatus === status && styles.filterChipActive
                        ]}
                        onPress={() => setFilterStatus(status as any)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          filterStatus === status && styles.filterChipTextActive
                        ]}>
                          {status === 'all' ? 'All' : status === 'on_hold' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Sort by:</Text>
                  <View style={styles.filterOptions}>
                    {[
                      { key: 'newest', label: 'Newest' },
                      { key: 'oldest', label: 'Oldest' },
                      { key: 'views', label: 'Views' },
                      { key: 'cost', label: 'Cost' }
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.key}
                        style={[
                          styles.filterChip,
                          sortBy === sort.key && styles.filterChipActive
                        ]}
                        onPress={() => setSortBy(sort.key as any)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          sortBy === sort.key && styles.filterChipTextActive
                        ]}>
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.searchContainer}>
                  <Search color="#666" size={16} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search videos..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X color="#666" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Video List */}
            <View style={styles.videoList}>
              {filteredVideos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Video color="#999" size={48} />
                  <Text style={styles.emptyStateText}>
                    {promotedVideos.length === 0 ? 'No promoted videos' : 'No videos match your filters'}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {promotedVideos.length === 0 
                      ? 'Promote your first video to get started'
                      : 'Try adjusting your search or filters'
                    }
                  </Text>
                </View>
              ) : (
                filteredVideos.map((video) => (
                  <View key={video.id} style={styles.videoItem}>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text style={styles.videoStats}>
                        {video.views_count}/{video.target_views} views • {video.duration_seconds}s • 🪙{video.coin_cost}
                      </Text>
                      <View style={styles.videoMeta}>
                        <Text style={styles.videoDate}>
                          {new Date(video.created_at).toLocaleDateString()}
                        </Text>
                        <View style={styles.videoStatusContainer}>
                          {video.status === 'on_hold' && holdTimers[video.id] && (
                            <View style={styles.holdTimer}>
                              <Timer color="#F39C12" size={12} />
                              <Text style={styles.holdTimerText}>
                                {formatHoldTimer(holdTimers[video.id])}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(video.status) }]}>
                            <Text style={styles.statusText}>
                              {getStatusText(video.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.videoActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleVideoAction(video, 'edit')}
                      >
                        <Edit3 color="#3498DB" size={16} />
                      </TouchableOpacity>
                      
                      {video.status === 'active' && (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleVideoAction(video, 'pause')}
                        >
                          <Pause color="#F39C12" size={16} />
                        </TouchableOpacity>
                      )}
                      
                      {video.status === 'paused' && (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleVideoAction(video, 'resume')}
                        >
                          <Play color="#2ECC71" size={16} />
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleVideoAction(video, 'delete')}
                      >
                        <Trash2 color="#E74C3C" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Enter your YouTube video URL and select target views and duration
              </Text>
            </View>
            
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Your video enters a 10-minute hold period before going live
              </Text>
            </View>
            
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Users watch your video and you get views when they complete the required duration
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {!showPromotionForm && (
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => setShowPromotionForm(true)}
              >
                <Plus color="#FF4757" size={24} />
                <Text style={styles.quickActionText}>Add Video</Text>
              </TouchableOpacity>
            )}
            
            {!showStats && (
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => setShowStats(true)}
              >
                <BarChart3 color="#3498DB" size={24} />
                <Text style={styles.quickActionText}>Show Stats</Text>
              </TouchableOpacity>
            )}
            
            {!showVideoList && (
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => setShowVideoList(true)}
              >
                <Video color="#2ECC71" size={24} />
                <Text style={styles.quickActionText}>Video List</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => fetchPromotedVideos(true)}
            >
              <RotateCcw color="#F39C12" size={24} />
              <Text style={styles.quickActionText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: 'white',
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#FFD700',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsSection: {
    margin: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  formSection: {
    margin: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#333',
  },
  externalLink: {
    padding: 4,
  },
  videoPreview: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  costSummary: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  costDescription: {
    fontSize: 12,
    color: '#666',
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(255, 71, 87, 0.3)',
      },
    }),
  },
  promoteButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  promoteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  insufficientFunds: {
    textAlign: 'center',
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 8,
  },
  videoListSection: {
    margin: 16,
  },
  videoListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#FF4757',
    borderColor: '#FF4757',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  videoList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoDate: {
    fontSize: 11,
    color: '#999',
  },
  videoStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  holdTimerText: {
    fontSize: 10,
    color: '#F39C12',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  videoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoSection: {
    margin: 16,
    marginTop: 0,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  quickActionsSection: {
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: (screenWidth - 48) / 2 - 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});