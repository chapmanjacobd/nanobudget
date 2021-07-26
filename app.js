const DateTime = luxon.DateTime;
const Duration = luxon.Duration;
const RRule = rrule.RRule;
const startOfDay = DateTime.local().startOf("day").toMillis();

function simpleTime2LuxonDur(simpleTime) {
  const dt = DateTime.fromFormat(simpleTime, "h:m").toMillis();
  const dur = Duration.fromMillis(dt - startOfDay);
  console.log(dur.toFormat("h 'hours' m 'minutes'"));
  return dur;
}

function newSimMoney(title = "Money budget") {
  return {
    title,
    inflows: [a("Rent", "800", "every Month")],
    outflows: [],
  };
}

function newSimTime(title = "Time budget") {
  return {
    title,
    inflows: [a("Yourseelf", "24:00", "Every day")], // task delegation
    outflows: [a("Sleep", "8:00", "Every 2 months until Jan 01 2077")],
  };
}

function a(account, duration_, frequency_) {
  return {
    account,
    duration: duration_.includes(":") ? simpleTime2LuxonDur(duration_) : currency(duration_),
    frequency: RRule.fromText(frequency_),
  };
}

function calcPlannedTime(events) {
  return DateTime.now().plus({
    days: 30 * 365,
    // (sum(events.map((c) => c.duration * c.)) ?? 0) }
  });
}

let targetDate = calcPlannedTime().toISODate();

function aggregate(frequency, duration) {
  console.log(frequency);
  console.log(duration);
  return duration * frequency.between(new Date(), targetDate).length;
}

console.log(newSimMoney().inflows.map(aggregate));

document.addEventListener("alpine:init", () => {
  Alpine.store("sims", {
    selectedSimulation: "Time budget",
    simulations: [newSimTime(), newSimMoney()],

    get(selection = this.selectedSimulation) {
      if (this.simulations.filter((x) => x.title === selection)[0])
        return this.simulations.filter((x) => x.title === selection)[0];

      return this.simulations[0];
    },
  });
});
